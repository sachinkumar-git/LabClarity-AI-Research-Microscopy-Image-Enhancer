/** Renders one processing run into a report: images, pipeline, models, quality, provenance. */
import { COLORS, imageRow, keyValues, paragraph, sectionTitle, table } from './pdfLayout.js';

const fmt = (v, digits = 3) => (typeof v === 'number' ? v.toFixed(digits) : '—');
const dims = (w, h) => (w && h ? `${w} x ${h}` : '—');

function qualityRows(quality) {
  const rows = [];
  if (quality?.consistency) {
    rows.push(['Consistency vs input', fmt(quality.consistency.psnr, 2), fmt(quality.consistency.ssim, 4), quality.consistency.method]);
  }
  if (quality?.reference && !quality.reference.skipped) {
    rows.push(['Ground-truth reference', fmt(quality.reference.psnr, 2), fmt(quality.reference.ssim, 4), quality.reference.method]);
  }
  return rows;
}

function noReferenceRows(nr) {
  if (!nr?.input || !nr?.output) return [];
  return ['noiseSigma', 'sharpness', 'rmsContrast', 'entropy'].map((key) => [key, fmt(nr.input[key], 4), fmt(nr.output[key], 4)]);
}

export function renderJobSection(doc, { job, images, integrity }) {
  const audit = job.audit ?? {};
  const m = job.metrics ?? {};
  sectionTitle(doc, `${job.label ?? job.model} — ${job.originalName}`);
  keyValues(doc, [
    ['Run ID', job.publicId],
    ['Status', job.status],
    ['Created / completed', `${job.createdAt?.toISOString?.() ?? '—'} / ${job.completedAt?.toISOString?.() ?? '—'}`],
    ['Input -> output', `${dims(m.inputWidth, m.inputHeight)} -> ${dims(m.outputWidth, m.outputHeight)} (x${job.scale})`],
    ['Region of interest', job.roi ? `x=${job.roi.x}, y=${job.roi.y}, ${job.roi.width} x ${job.roi.height}` : 'Full image'],
    ['Device / compute time', `${m.device ?? '—'} / ${m.durationMs ?? '—'} ms`],
    ['Input SHA-256', job.inputSha256 ?? '—'],
    ['Original integrity', integrity ? (integrity.intact ? 'Verified intact at report time' : 'MISMATCH - original changed') : 'Not checked'],
  ]);
  if (job.status !== 'completed') {
    paragraph(doc, `This run did not complete: ${job.errorMessage ?? 'pending'}`, { color: COLORS.warn });
    return;
  }

  imageRow(doc, images);
  if (audit.output?.intensityPreserving === false) {
    paragraph(doc, 'Contrast remapping was applied: output intensities are not quantitatively comparable to the original.', { color: COLORS.warn });
  }

  sectionTitle(doc, 'Processing steps');
  table(
    doc,
    ['#', 'Operation', 'Method / model', 'Parameters', 'Time'],
    (audit.steps ?? []).map((s) => [
      String(s.index + 1), s.op, s.model?.id ?? s.method, JSON.stringify(s.params ?? {}), `${s.durationMs ?? '—'} ms`,
    ]),
    [4, 14, 18, 50, 9],
  );

  const models = (audit.steps ?? []).filter((s) => s.model);
  if (models.length) {
    sectionTitle(doc, 'Model provenance');
    table(
      doc,
      ['Model', 'Version', 'Weights SHA-256', 'Source'],
      models.map(({ model }) => [model.name ?? model.id, model.version ?? '—', model.weightsSha256 ?? 'n/a (built-in)', model.source ?? '—']),
      [18, 10, 40, 32],
    );
  }

  sectionTitle(doc, 'Quality assessment');
  const qRows = qualityRows(job.quality);
  if (qRows.length) table(doc, ['Comparison', 'PSNR (dB)', 'SSIM', 'Method'], qRows, [22, 12, 10, 56]);
  if (job.quality?.consistency?.note) paragraph(doc, `Note: ${job.quality.consistency.note}`, { color: COLORS.warn, size: 8 });
  if (job.quality?.reference?.skipped) paragraph(doc, `Reference metrics skipped: ${job.quality.reference.skipped}`, { size: 8 });
  const nr = noReferenceRows(job.quality?.noReference);
  if (nr.length) table(doc, ['No-reference metric (input grid)', 'Input', 'Output'], nr, [50, 25, 25]);

  const sw = audit.software ?? {};
  paragraph(
    doc,
    `Software: ${Object.entries(sw).map(([k, v]) => `${k} ${v ?? 'n/a'}`).join(', ')}`,
    { color: COLORS.muted, size: 7 },
  );
}
