/** Small layout toolkit on top of PDFKit: headings, key-value blocks, tables, image rows. */
import PDFDocument from 'pdfkit';

export const COLORS = { ink: '#0f172a', muted: '#64748b', accent: '#0891b2', line: '#e2e8f0', warn: '#b45309' };
const MARGIN = 48;

/** Built-in PDF fonts use WinAnsi encoding: map common symbols to safe equivalents. */
export function safeText(value) {
  return String(value ?? '—')
    .replace(/→/g, '->').replace(/×/g, 'x').replace(/σ/g, 'sigma')
    .replace(/[^\x20-\x7E -ÿ—–]/g, '?');
}

export function createDoc(title) {
  return new PDFDocument({
    size: 'A4',
    margin: MARGIN,
    bufferPages: true,
    info: { Title: safeText(title), Author: 'LabClarity AI', Creator: 'LabClarity AI report generator' },
  });
}

const contentWidth = (doc) => doc.page.width - MARGIN * 2;

export function ensureSpace(doc, height) {
  if (doc.y + height > doc.page.height - MARGIN - 20) doc.addPage();
}

export function header(doc, title, subtitle) {
  doc.fillColor(COLORS.accent).font('Helvetica-Bold').fontSize(9).text('LABCLARITY AI  ·  RESEARCH REPORT');
  doc.moveDown(0.3).fillColor(COLORS.ink).fontSize(20).text(safeText(title));
  if (subtitle) doc.moveDown(0.2).font('Helvetica').fontSize(10).fillColor(COLORS.muted).text(safeText(subtitle));
  doc.moveDown(0.6).strokeColor(COLORS.line).lineWidth(1)
    .moveTo(MARGIN, doc.y).lineTo(doc.page.width - MARGIN, doc.y).stroke();
  doc.moveDown(0.8);
}

export function sectionTitle(doc, text) {
  ensureSpace(doc, 40);
  doc.moveDown(0.5).font('Helvetica-Bold').fontSize(12).fillColor(COLORS.ink).text(safeText(text));
  doc.moveDown(0.3);
}

export function paragraph(doc, text, { color = COLORS.ink, size = 9 } = {}) {
  doc.font('Helvetica').fontSize(size).fillColor(color).text(safeText(text), { width: contentWidth(doc) });
  doc.moveDown(0.3);
}

export function keyValues(doc, rows) {
  const keyWidth = 140;
  rows.forEach(([key, value]) => {
    ensureSpace(doc, 16);
    const y = doc.y;
    doc.font('Helvetica').fontSize(9).fillColor(COLORS.muted).text(safeText(key), MARGIN, y, { width: keyWidth });
    doc.fillColor(COLORS.ink).text(safeText(value), MARGIN + keyWidth, y, { width: contentWidth(doc) - keyWidth });
    doc.moveDown(0.15);
  });
  doc.x = MARGIN;
}

export function table(doc, headers, rows, widths) {
  const total = widths.reduce((a, b) => a + b, 0);
  const scaled = widths.map((w) => (w / total) * contentWidth(doc));
  const drawRow = (cells, bold) => {
    ensureSpace(doc, 18);
    const y = doc.y;
    let x = MARGIN;
    doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(8).fillColor(bold ? COLORS.muted : COLORS.ink);
    const heights = cells.map((cell, i) => doc.heightOfString(safeText(cell), { width: scaled[i] - 6 }));
    cells.forEach((cell, i) => {
      doc.text(safeText(cell), x + 3, y + 3, { width: scaled[i] - 6 });
      x += scaled[i];
    });
    const rowHeight = Math.max(...heights) + 6;
    doc.strokeColor(COLORS.line).moveTo(MARGIN, y + rowHeight).lineTo(MARGIN + contentWidth(doc), y + rowHeight).stroke();
    doc.y = y + rowHeight;
  };
  drawRow(headers, true);
  rows.forEach((row) => drawRow(row, false));
  doc.x = MARGIN;
  doc.moveDown(0.4);
}

/** Renders up to three labelled images side by side, scaled to fit. */
export function imageRow(doc, images, height = 170) {
  ensureSpace(doc, height + 30);
  const gap = 10;
  const width = (contentWidth(doc) - gap * (images.length - 1)) / images.length;
  const y = doc.y;
  images.forEach(({ buffer, label }, i) => {
    const x = MARGIN + i * (width + gap);
    doc.rect(x, y, width, height).fillColor('#0b1220').fill();
    try {
      doc.image(buffer, x, y, { fit: [width, height], align: 'center', valign: 'center' });
    } catch {
      doc.fillColor('#94a3b8').fontSize(8).text('Image could not be embedded', x, y + height / 2, { width, align: 'center' });
    }
    doc.fillColor(COLORS.muted).font('Helvetica').fontSize(8).text(safeText(label), x, y + height + 4, { width, align: 'center' });
  });
  doc.x = MARGIN;
  doc.y = y + height + 22;
}

export function finalize(doc) {
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i += 1) {
    doc.switchToPage(i);
    const bottom = doc.page.height - MARGIN + 10;
    doc.page.margins.bottom = 0;
    doc.font('Helvetica').fontSize(7).fillColor(COLORS.muted).text(
      `Processed images are not verified scientific data. Originals are preserved unmodified.   Page ${i + 1} of ${range.count}`,
      MARGIN, bottom, { width: doc.page.width - MARGIN * 2, align: 'center' },
    );
  }
  return new Promise((resolve, reject) => {
    const chunks = [];
    doc.on('data', (c) => chunks.push(c)).on('end', () => resolve(Buffer.concat(chunks))).on('error', reject);
    doc.end();
  });
}
