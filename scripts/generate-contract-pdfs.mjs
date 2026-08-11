/**
 * Generate multi-page realistic contract PDFs from shared content.
 * Run: npm run setup:contracts
 * Matching uses data/documents/extracted.json (unchanged) — display docs only get richer.
 */
import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { CONTRACTS } from './contract-content.mjs';

const __dir = dirname(fileURLToPath(import.meta.url));
const contractsDir = join(__dir, '..', 'public', 'documents', 'contracts');

const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const MARGIN = 50;
const MAX_WIDTH = PAGE_WIDTH - MARGIN * 2;
const LINE_HEIGHT = 13;
const FOOTER_Y = 35;

async function buildPdf(contract) {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const italic = await pdf.embedFont(StandardFonts.HelveticaOblique);

  let page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let pageNum = 1;
  let y = PAGE_HEIGHT - 60;

  const addPage = () => {
    drawFooter(page, pageNum, contract);
    page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    pageNum++;
    y = PAGE_HEIGHT - 60;
  };

  const drawFooter = (p, num, c) => {
    p.drawLine({
      start: { x: MARGIN, y: FOOTER_Y + 12 },
      end: { x: PAGE_WIDTH - MARGIN, y: FOOTER_Y + 12 },
      thickness: 0.5,
      color: rgb(0.75, 0.75, 0.75),
    });
    p.drawText('Confidential — Lidl UK Procurement', {
      x: MARGIN, y: FOOTER_Y, size: 7, font: italic, color: rgb(0.5, 0.5, 0.5),
    });
    p.drawText(`${c.id} · ${c.ref} · Page ${num}`, {
      x: PAGE_WIDTH - MARGIN - 120, y: FOOTER_Y, size: 7, font: font, color: rgb(0.5, 0.5, 0.5),
    });
  };

  const ensureSpace = (needed = LINE_HEIGHT) => {
    if (y - needed < FOOTER_Y + 24) addPage();
  };

  const drawWrapped = (text, size = 10, useBold = false, color = rgb(0.12, 0.12, 0.15)) => {
    const f = useBold ? bold : font;
    const words = text.split(' ');
    let line = '';
    for (const w of words) {
      const test = line ? `${line} ${w}` : w;
      if (f.widthOfTextAtSize(test, size) > MAX_WIDTH) {
        ensureSpace();
        page.drawText(line, { x: MARGIN, y, size, font: f, color });
        y -= LINE_HEIGHT;
        line = w;
      } else line = test;
    }
    if (line) {
      ensureSpace();
      page.drawText(line, { x: MARGIN, y, size, font: f, color });
      y -= LINE_HEIGHT;
    }
  };

  // Cover block
  page.drawText('LIDL GREAT BRITAIN LIMITED', {
    x: MARGIN, y, size: 9, font: bold, color: rgb(0, 0.31, 0.67),
  });
  y -= 22;
  drawWrapped(contract.title, 16, true, rgb(0.05, 0.1, 0.2));
  y -= 6;
  drawWrapped(`Master Supply Agreement — ${contract.category}`, 10, false, rgb(0.4, 0.45, 0.5));
  y -= 16;

  const metaLines = [
    `Contract ID: ${contract.id}`,
    `Document Ref: ${contract.ref}`,
    `Supplier: ${contract.supplier} (${contract.supplierId})`,
    `Category: ${contract.category}`,
    `Annual Value: ${contract.value}`,
    `Effective: ${contract.effective}`,
  ];
  for (const m of metaLines) {
    drawWrapped(m, 9, false, rgb(0.35, 0.4, 0.45));
  }
  y -= 20;
  page.drawLine({
    start: { x: MARGIN, y },
    end: { x: PAGE_WIDTH - MARGIN, y },
    thickness: 2,
    color: rgb(0, 0.31, 0.67),
  });
  y -= 24;

  drawWrapped('TABLE OF CONTENTS', 9, true, rgb(0, 0.31, 0.67));
  y -= 4;
  contract.sections.forEach((s, i) => {
    drawWrapped(`${i + 1}. ${s.heading}`, 8, false, rgb(0.4, 0.45, 0.5));
  });
  y -= 16;

  for (const section of contract.sections) {
    ensureSpace(30);
    drawWrapped(section.heading, 11, true, rgb(0, 0.31, 0.67));
    y -= 6;
    for (const line of section.lines) {
      const isKey = line.includes('BACKUP VENDOR ACTIVATION') || line.includes('PENALTY —') || line.includes('BACKUP SCOPE:') || line.includes('ACTIVATION:') || line.includes('SCOPE:');
      if (isKey) y -= 4;
      drawWrapped(line, isKey ? 10 : 9, isKey, isKey ? rgb(0.1, 0.15, 0.25) : rgb(0.2, 0.2, 0.25));
      if (isKey) y -= 4;
    }
    y -= 10;
  }

  // Signature block
  ensureSpace(80);
  y -= 10;
  page.drawLine({
    start: { x: MARGIN, y },
    end: { x: PAGE_WIDTH - MARGIN, y },
    thickness: 0.5,
    color: rgb(0.7, 0.7, 0.7),
  });
  y -= 20;
  drawWrapped('For and on behalf of Lidl Great Britain Limited', 9, true);
  y -= 40;
  page.drawLine({ start: { x: MARGIN, y }, end: { x: MARGIN + 200, y }, thickness: 0.5, color: rgb(0.3, 0.3, 0.3) });
  y -= LINE_HEIGHT;
  drawWrapped('Authorised Signatory — Procurement', 8, false, rgb(0.5, 0.5, 0.5));

  drawFooter(page, pageNum, contract);

  const bytes = await pdf.save();
  writeFileSync(join(contractsDir, `${contract.id}.pdf`), bytes);
  console.log(`  ✓ ${contract.id}.pdf (${pageNum} pages)`);
}

console.log('Generating multi-page contract PDFs...');
for (const c of CONTRACTS) {
  await buildPdf(c);
}
console.log('Done. HTML documents updated in public/documents/contracts/');
