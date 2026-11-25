/** PDF reports and dashboard statistics. */
import { sendSuccess } from '../views/responseView.js';
import { toJobSummary } from '../views/jobView.js';

function sendPdf(res, buffer, filename) {
  res.set({
    'Content-Type': 'application/pdf',
    'Content-Disposition': `attachment; filename="${filename}"`,
    'Cache-Control': 'no-store',
  });
  return res.send(buffer);
}

const stamp = () => new Date().toISOString().slice(0, 10);

export function createInsightController({ reportService, statsService }) {
  return {
    async jobReport(req, res) {
      return sendPdf(res, await reportService.forJob(req.params.id), `labclarity-run-${req.params.id.slice(0, 8)}-${stamp()}.pdf`);
    },

    async batchReport(req, res) {
      return sendPdf(res, await reportService.forBatch(req.params.id), `labclarity-batch-${req.params.id.slice(0, 8)}-${stamp()}.pdf`);
    },

    async experimentReport(req, res) {
      const pdf = await reportService.forExperiment(req.params.id);
      return sendPdf(res, pdf, `labclarity-experiment-${req.params.id.slice(0, 8)}-${stamp()}.pdf`);
    },

    async stats(req, res) {
      const days = [7, 14, 30].includes(Number(req.query.days)) ? Number(req.query.days) : 14;
      const overview = await statsService.overview({ days });
      return sendSuccess(res, { ...overview, recent: overview.recent.map(toJobSummary) });
    },
  };
}
