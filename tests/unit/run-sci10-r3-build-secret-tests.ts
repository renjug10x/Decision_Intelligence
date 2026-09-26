/**
 * `R-SCI10-3` — no live secret in a distributable build artefact.
 *
 * `next build` with `output: 'standalone'` copies a loaded `.env` / `.env.production` into
 * `.next/standalone/`. `npm run build` therefore ends with `scripts/seal-standalone-artefact.mjs`,
 * which removes those copies and refuses the build if any credential value, env file or
 * `NEXT_PUBLIC_*` credential name remains anywhere in the output. This suite drives that step against
 * synthetic build trees holding a FAKE credential — no real secret is read, written or printed — and
 * holds the runtime-injection model to its structure.
 *
 * The fresh production build, the artefact scan and the provider-off / runtime-injected acceptance are
 * recorded in the `SCI-10` report (§12a).
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

const ROOT = join(__dirname, '..', '..');
const SEAL = join(ROOT, 'scripts/seal-standalone-artefact.mjs');
const FAKE = 'FAKE-cred-9f3c1e7a5b2d4c6e8a0b1c2d3e4f5a6b7c8d'; // shaped like a key, valid nowhere

let passed = 0;
let failed = 0;
function assert(condition: boolean, name: string, detail?: string) {
  if (condition) { console.log(`[PASS] ${name}`); passed++; }
  else { console.error(`[FAIL] ${name} — ${detail ?? 'assertion failed'}`); failed++; }
}
const stripComments = (code: string) => code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*(#|\/\/).*$/gm, '');
const read = (rel: string) => readFileSync(join(ROOT, rel), 'utf8');

/** A throwaway project with a build output; files maps relative path → contents. */
function fixture(files: Record<string, string>): string {
  const dir = mkdtempSync(join(tmpdir(), 'r-sci10-3-'));
  for (const [path, contents] of Object.entries(files)) {
    mkdirSync(dirname(join(dir, path)), { recursive: true });
    writeFileSync(join(dir, path), contents);
  }
  return dir;
}
const outputs: string[] = [];
function seal(dir: string) {
  const env = { ...process.env };
  for (const k of Object.keys(env)) if (/GEMINI/i.test(k)) delete env[k];
  const r = spawnSync(process.execPath, [SEAL, '--root', dir], { encoding: 'utf8', env });
  outputs.push(r.stdout + r.stderr);
  return { code: r.status, out: r.stdout + r.stderr };
}
const standalone = {
  '.next/standalone/server.js': 'require("next")',
  '.next/standalone/.next/server/app/page.js': 'const key = process.env.GEMINI_API_KEY;',
  '.next/static/chunks/app.js': 'console.log("client")'
};

function run() {
  console.log('\n=== A. THE BUILD ENTRY POINT SEALS THE ARTEFACT =====================\n');
  const pkg = JSON.parse(read('package.json'));
  assert(pkg.scripts.build === 'next build && node scripts/seal-standalone-artefact.mjs',
    'A1: `npm run build` is `next build` followed by the sealing step — no manual step, no separate command', pkg.scripts.build);
  const dockerfiles = ['Dockerfile', 'docker/Dockerfile.web'].map(read).map(stripComments);
  assert(dockerfiles.every(d => /RUN npm run build/.test(d)),
    'A2: both Dockerfiles build through `npm run build`, so container builds are sealed by the same step');
  const dockerignore = read('.dockerignore');
  assert(/^\.env$/m.test(dockerignore) && /^\.env\.\*$/m.test(dockerignore) && /^!\.env\.example$/m.test(dockerignore),
    'A3: host env files stay out of every Docker build context (only the placeholder template enters)');
  assert(/rm -f \.env \.env\.\*/.test(stripComments(read('docker/Dockerfile.web'))),
    'A4: …and the web runner image still removes env files as a second line');

  console.log('\n=== B. THE SEALING STEP, ON SYNTHETIC BUILD OUTPUT ==================\n');
  const copied = fixture({ ...standalone, '.env': `GEMINI_API_KEY=${FAKE}\nNODE_ENV=production\n`, '.next/standalone/.env': `GEMINI_API_KEY=${FAKE}\nNODE_ENV=production\n` });
  const sealed = seal(copied);
  assert(sealed.code === 0 && !existsSync(join(copied, '.next/standalone/.env')),
    'B1: the `.env` Next.js copied into the standalone server is removed, and the build passes', sealed.out);
  assert(existsSync(join(copied, '.env')) && existsSync(join(copied, '.next/standalone/server.js')),
    'B2: …the project\'s own `.env` and the server itself are untouched — the operator\'s runtime configuration is not the artefact');
  assert(/removed 1 copied env file/.test(sealed.out) && /GEMINI_API_KEY/.test(sealed.out) && /none packaged/.test(sealed.out),
    'B3: it reports what it removed and which credentials it verified, by name');

  const production = fixture({ ...standalone, '.env.production': `GEMINI_API_KEY=${FAKE}\n`, '.next/standalone/.env.production': `GEMINI_API_KEY=${FAKE}\n` });
  const p = seal(production);
  assert(p.code === 0 && !existsSync(join(production, '.next/standalone/.env.production')),
    'B4: `.env.production` — the other file Next.js copies — is removed the same way');

  const inClient = fixture({ ...standalone, '.env': `GEMINI_API_KEY=${FAKE}\n`, '.next/static/chunks/leak.js': `const k="${FAKE}";` });
  const c = seal(inClient);
  assert(c.code === 1 && /REFUSED/.test(c.out) && /GEMINI_API_KEY/.test(c.out) && /static\/chunks\/leak\.js/.test(c.out),
    'B5: a credential VALUE anywhere in the output — here a client bundle — fails the build, naming the variable and the file', c.out);
  const inServer = fixture({ ...standalone, '.env.local': `GEMINI_API_KEY=${FAKE}\n`, '.next/standalone/.next/server/chunks/x.js': `var k="${FAKE}"` });
  assert(seal(inServer).code === 1, 'B6: …and so does one inlined into a server chunk (values are read from every env file Next.js loads)');

  const otherEnv = fixture({ ...standalone, '.next/server/.env': 'X=1' });
  const o = seal(otherEnv);
  assert(o.code === 1 && /server\/\.env is an env file inside the build output/.test(o.out),
    'B7: an env file anywhere else in the output is refused, not silently deleted');

  const publicName = fixture({ ...standalone, '.env.local': `NEXT_PUBLIC_GEMINI_API_KEY=${FAKE}\n` });
  const pub = seal(publicName);
  assert(pub.code === 1 && /NEXT_PUBLIC_GEMINI_API_KEY/.test(pub.out) && /inlines/.test(pub.out),
    'B8: a NEXT_PUBLIC_* credential name is refused — Next.js would inline it into the browser');

  const localOnly = fixture({ ...standalone, '.env.local': `GEMINI_API_KEY=${FAKE}\n` });
  const l = seal(localOnly);
  assert(l.code === 0 && /removed 0 copied env file/.test(l.out), 'B9: a key kept only in `.env.local` (never copied) passes with nothing to remove');

  const thirdParty = fixture({ ...standalone, '.next/standalone/node_modules/somepkg/.env.example': 'SOME_PLACEHOLDER=1' });
  const t = seal(thirdParty);
  assert(t.code === 0 && existsSync(join(thirdParty, '.next/standalone/node_modules/somepkg/.env.example')),
    'B10: a dependency\'s own env template inside node_modules is not the project\'s secret and is left alone');

  const noBuild = fixture({ '.env': `GEMINI_API_KEY=${FAKE}\n` });
  assert(seal(noBuild).code === 1, 'B11: with no build output there is nothing to seal, and it says so rather than passing');

  assert(outputs.length >= 9 && outputs.every(out => !out.includes(FAKE)),
    'B12: across every run — passing and refused — the credential value is never printed');
  for (const dir of [copied, production, inClient, inServer, otherEnv, publicName, localOnly, thirdParty, noBuild]) rmSync(dir, { recursive: true, force: true });

  console.log('\n=== C. THE CREDENTIAL IS A RUNTIME, SERVER-SIDE INPUT ==============\n');
  const provider = stripComments(read('lib/scenario-authoring/genai-draft-provider.ts'));
  assert(/process\.env\[GEMINI_API_KEY_ENV_VAR\]|process\.env\.GEMINI_API_KEY/.test(provider)
    && /function resolveApiKey/.test(provider) && /const apiKey = resolveApiKey\(options\)/.test(provider),
    'C1: the governed provider reads GEMINI_API_KEY from the server process at call time — never at build time');
  const nextConfig = stripComments(read('next.config.ts'));
  assert(!/GEMINI/i.test(nextConfig), 'C2: next.config.ts inlines no Gemini variable into any bundle (its `env` block names none)');
  const sources = spawnSync('git', ['grep', '-l', '-E', 'NEXT_PUBLIC_[A-Z_]*GEMINI|NEXT_PUBLIC_[A-Z_]*(API_?KEY|SECRET|TOKEN)', '--', 'app', 'lib', 'components', 'context', 'next.config.ts', 'docker', 'Dockerfile', 'docker-compose.yml'],
    { cwd: ROOT, encoding: 'utf8' }).stdout.trim();
  assert(sources === '', 'C3: no NEXT_PUBLIC_* credential path exists anywhere in the application, its config or its containers', sources);
  assert(/GEMINI_API_KEY=\$\{GEMINI_API_KEY:-\}/.test(read('docker-compose.yml')),
    'C4: the deployment injects GEMINI_API_KEY into the web server at run time, from the host');

  console.log(`\n=== R-SCI10-3: ${passed} passed, ${failed} failed ===`);
  process.exit(failed === 0 ? 0 : 1);
}

run();
