#!/usr/bin/env node
/**
 * Seal the production build artefact: no live secret leaves the build (`R-SCI10-3`).
 * ───────────────────────────────────────────────────────────────────────────────
 * Runs as the last step of `npm run build`, which is what a native build, `Dockerfile` and
 * `docker/Dockerfile.web` all invoke.
 *
 * Why this step exists
 * --------------------
 * With `output: 'standalone'`, Next.js (16.2.7, `writeStandaloneDirectory` in
 * `next/dist/build/index.js`) copies every env file it loaded that is named exactly `.env` or
 * `.env.production` into `.next/standalone/`. That is unconditional: there is no config option or
 * CLI flag to switch it off, and a build adapter's `onBuildComplete` runs BEFORE the standalone
 * directory is written. So a build on a machine whose `.env` holds `GEMINI_API_KEY` packages the
 * live key into the distributable server. (`.env.local` is loaded but never copied.)
 *
 * The model this enforces
 * -----------------------
 *   the build artefact carries code and configuration structure, never a live secret;
 *   the runtime environment injects `GEMINI_API_KEY` into the server process
 *   (`docker-compose.yml`: `GEMINI_API_KEY=${GEMINI_API_KEY:-}`; or the shell that starts `server.js`).
 *
 * What it does
 * ------------
 *   1. Removes the env files Next.js copied into `.next/standalone/` (outside `node_modules`).
 *   2. Verifies the WHOLE build output (`.next/`: standalone server, static client bundles, server
 *      chunks) holds no `.env*` file and no value of any credential-named variable the build could
 *      see — read from the env files Next.js loads and from the build's own environment.
 *   3. Refuses a `NEXT_PUBLIC_*` credential-named variable: Next.js would inline it into the browser.
 * Any failure exits non-zero, so the build fails rather than ship a secret. It prints variable NAMES
 * and file PATHS only — never a value.
 *
 *   node scripts/seal-standalone-artefact.mjs [--root <project dir>] [--dist <dist dir, default .next>]
 */
import { existsSync, lstatSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const arg = name => {
  const i = process.argv.indexOf(name);
  return i > -1 ? process.argv[i + 1] : undefined;
};
const ROOT = resolve(arg('--root') ?? process.cwd());
const DIST = resolve(ROOT, arg('--dist') ?? '.next');
const STANDALONE = join(DIST, 'standalone');

/** The files `@next/env` loads for a production build, in its own order. */
const LOADED_ENV_FILES = ['.env.production.local', '.env.local', '.env.production', '.env'];
const CREDENTIAL_NAME = /(API_?KEY|SECRET|TOKEN|PASSWORD|PASSWD|CREDENTIAL|PRIVATE_?KEY)/i;
/** Shorter values are too likely to occur by coincidence to be a meaningful search. */
const MIN_SECRET_LENGTH = 16;
const ENV_FILE = /(^|[\\/])\.env(\.[^\\/]*)?$/;

function parseEnvFile(path) {
  const out = {};
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!m) continue;
    out[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
  }
  return out;
}

function walk(dir, visit) {
  if (!existsSync(dir)) return;
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    const stat = lstatSync(path);
    if (stat.isSymbolicLink()) continue;
    if (stat.isDirectory()) walk(path, visit);
    else visit(path);
  }
}

const problems = [];
const rel = path => relative(ROOT, path);

if (!existsSync(DIST)) {
  console.error(`[seal] No build output at ${rel(DIST) || DIST}. Run next build first.`);
  process.exit(1);
}

// ── Every credential the build could have seen: names and values, values never printed ──
const credentials = new Map();
const sources = [...LOADED_ENV_FILES.filter(f => existsSync(join(ROOT, f))).map(f => [f, parseEnvFile(join(ROOT, f))]), ['process.env', process.env]];
for (const [source, vars] of sources) {
  for (const [name, value] of Object.entries(vars)) {
    if (!CREDENTIAL_NAME.test(name) || typeof value !== 'string') continue;
    if (name.startsWith('NEXT_PUBLIC_') && value.trim()) {
      problems.push(`${name} (${source}) is a NEXT_PUBLIC_ credential name: Next.js inlines NEXT_PUBLIC_* values into the browser bundle. Credentials are server-side only.`);
      continue;
    }
    if (value.trim().length >= MIN_SECRET_LENGTH) credentials.set(`${name}@${source}`, value.trim());
  }
}

// ── 1. Remove the env files Next.js copied into the standalone server ──
const removed = [];
walk(STANDALONE, path => {
  if (!ENV_FILE.test(path) || relative(STANDALONE, path).split(/[\\/]/).includes('node_modules')) return;
  rmSync(path, { force: true });
  removed.push(rel(path));
});

// ── 2. Verify the whole build output ──
let scanned = 0;
walk(DIST, path => {
  scanned += 1;
  const inNodeModules = relative(DIST, path).split(/[\\/]/).includes('node_modules');
  if (ENV_FILE.test(path) && !inNodeModules) problems.push(`${rel(path)} is an env file inside the build output.`);
  if (credentials.size === 0) return;
  const bytes = readFileSync(path);
  for (const [label, value] of credentials) {
    if (bytes.indexOf(value) !== -1) problems.push(`the value of ${label.split('@')[0]} (from ${label.split('@')[1]}) occurs in ${rel(path)}.`);
  }
});

const names = [...new Set([...credentials.keys()].map(k => k.split('@')[0]))];
if (problems.length > 0) {
  console.error('[seal] REFUSED — the build output would carry a secret. Nothing is published from this build:');
  for (const p of problems) console.error(`  - ${p}`);
  console.error('[seal] Keep credentials out of the artefact: inject them into the server process at runtime.');
  process.exit(1);
}
console.log(`[seal] Build artefact sealed: removed ${removed.length} copied env file(s)${removed.length ? ` (${removed.join(', ')})` : ''}; `
  + `scanned ${scanned} files for ${names.length} credential value(s) [${names.join(', ') || 'none present'}] — none packaged. `
  + 'Credentials are injected at runtime.');
