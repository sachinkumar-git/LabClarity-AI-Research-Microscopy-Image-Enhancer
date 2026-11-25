/**
 * Data-driven PDF reports. All content comes from recorded measurements and the audit trail;
 * no text is generated or inferred, so nothing in a report is fabricated.
 */
import { Asset } from '../../models/Asset.js';
import { Experiment } from '../../models/Experiment.js';
import { Job } from '../../models/Job.js';
import { AppError } from '../../utils/AppError.js';
import { renderJobSection } from './jobSection.js';
import { COLORS, createDoc, finalize, header, keyValues, paragraph, sectionTitle, table } from './pdfLayout.js';

export const MAX_RUNS_PER_REPORT = 30;
const METHOD_NOTE =
  'Consistency PSNR/SSIM compare the output (resampled to the input grid) with the measured input: they show ' +
  'agreement with the data, not that added detail is real. Ground-truth metrics appear only when a reference image was supplied.';

export function createReportService({ storage, assetService }) {
  async function imagesFor(job) {
    if (job.status !== 'completed') return [];
    const read = (key) => (key ? storage.read(key) : null);
    const [original, enhanced, diff] = await Promise.all([
      read(job.files.preview ?? job.files.original), read(job.files.enhanced), read(job.files.diff),
    ]);
    return [
      { buffer: original, label: job.roi ? 'Original (full image; ROI processed)' : 'Original (unmodified)' },
      { buffer: enhanced, label: 'Processed output (not verified)' },
      ...(diff ? [{ buffer: diff, label: 'Difference vs bicubic baseline' }] : []),
    ].filter((img) => img.buffer);
  }

  async function integrityFor(job) {
    if (!job.assetId) return null;
    return assetService.verify(job.assetId).catch(() => null);
  }

  async function summaryTable(doc, jobs) {
    sectionTitle(doc, 'Run comparison');
    table(
      doc,
      ['Run', 'Image', 'Status', 'Output', 'Consistency PSNR / SSIM', 'Noise in -> out', 'Time'],
      jobs.map((j) => {
        const q = j.quality ?? {};
        const nr = q.noReference ?? {};
        return [
          j.label ?? j.model, j.originalName, j.status,
          j.metrics?.outputWidth ? `${j.metrics.outputWidth} x ${j.metrics.outputHeight}` : '—',
          q.consistency ? `${q.consistency.psnr} / ${q.consistency.ssim}` : '—',
          nr.input ? `${nr.input.noiseSigma} -> ${nr.output.noiseSigma}` : '—',
          j.metrics?.durationMs != null ? `${j.metrics.durationMs} ms` : '—',
        ];
      }),
      [22, 18, 10, 12, 16, 14, 8],
    );
    paragraph(doc, METHOD_NOTE, { color: COLORS.muted, size: 8 });
  }

  async function render(title, subtitle, meta, jobs) {
    if (!jobs.length) throw AppError.notFound('Nothing to report yet');
    const doc = createDoc(title);
    header(doc, title, subtitle);
    keyValues(doc, [...meta, ['Generated', new Date().toISOString()], ['Runs included', String(jobs.length)]]);
    if (jobs.length > 1) await summaryTable(doc, jobs);
    for (const [i, job] of jobs.entries()) {
      if (i > 0 || jobs.length > 1) doc.addPage();
      renderJobSection(doc, { job, images: await imagesFor(job), integrity: await integrityFor(job) });
    }
    return finalize(doc);
  }

  return {
    async forJob(publicId) {
      const job = await Job.findOne({ publicId });
      if (!job) throw AppError.notFound('Job not found');
      return render('Image restoration report', job.originalName, [['Run', job.label ?? job.model]], [job]);
    },

    async forBatch(batchId) {
      const jobs = await Job.find({ batchId }).sort({ createdAt: 1 }).limit(MAX_RUNS_PER_REPORT);
      return render('Comparison / batch report', `Batch ${batchId}`, [['Batch ID', batchId]], jobs);
    },

    async forExperiment(publicId) {
      const experiment = await Experiment.findOne({ publicId });
      if (!experiment) throw AppError.notFound('Experiment not found');
      const [jobs, imageCount] = await Promise.all([
        Job.find({ experimentId: publicId }).sort({ createdAt: -1 }).limit(MAX_RUNS_PER_REPORT),
        Asset.countDocuments({ experimentId: publicId }),
      ]);
      return render(`Experiment: ${experiment.name}`, experiment.description || 'No description', [
        ['Experiment ID', publicId],
        ['Tags', experiment.tags.join(', ') || '—'],
        ['Source images', String(imageCount)],
      ], jobs);
    },
  };
}
