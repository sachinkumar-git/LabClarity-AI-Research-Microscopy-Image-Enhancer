/**
 * Batch/run controls: retry failed runs and cancel queued ones.
 * A run that is already processing cannot be interrupted mid-inference; cancel reports how
 * many runs were left running so the UI can say so instead of pretending.
 */
import { JOB_STATUS } from '../config/constants.js';
import { Job } from '../models/Job.js';
import { AppError } from '../utils/AppError.js';

export function createRunControlService({ storage, onJobCreated }) {
  async function retry(filter) {
    const failed = await Job.find({ ...filter, status: JOB_STATUS.FAILED });
    for (const job of failed) {
      const { enhanced, enhancedData, diff } = job.files;
      await Promise.all([enhanced, enhancedData, diff].map((key) => storage.remove(key)));
      job.set({
        status: JOB_STATUS.QUEUED,
        errorMessage: undefined,
        startedAt: undefined,
        completedAt: undefined,
        audit: null,
        quality: null,
        metrics: undefined,
        'files.enhanced': undefined,
        'files.enhancedData': undefined,
        'files.diff': undefined,
      });
      await job.save();
      onJobCreated(job);
    }
    return failed.length;
  }

  async function assertExists(filter, message) {
    if (!(await Job.exists(filter))) throw AppError.notFound(message);
  }

  return {
    async retryBatch(batchId) {
      await assertExists({ batchId }, 'Batch not found');
      return { retried: await retry({ batchId }) };
    },

    async retryJob(publicId) {
      await assertExists({ publicId }, 'Job not found');
      const retried = await retry({ publicId });
      if (!retried) throw AppError.conflict('Only failed runs can be retried');
      return { retried };
    },

    async cancelBatch(batchId) {
      await assertExists({ batchId }, 'Batch not found');
      const result = await Job.updateMany(
        { batchId, status: JOB_STATUS.QUEUED },
        { status: JOB_STATUS.FAILED, errorMessage: 'Cancelled by user', completedAt: new Date() },
      );
      const stillRunning = await Job.countDocuments({ batchId, status: JOB_STATUS.PROCESSING });
      return { cancelled: result.modifiedCount, stillRunning };
    },
  };
}
