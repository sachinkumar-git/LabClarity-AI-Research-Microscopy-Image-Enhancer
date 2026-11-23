/**
 * Orchestrates the enhancement workflow: select file -> upload -> poll -> result.
 * Exposes a single derived `phase` the UI renders from.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { uploadImage } from '../api/imageApi.js';
import { DEFAULT_SCALE } from '../config.js';
import { validateFile } from '../utils/validateFile.js';
import { useJobParam } from './useJobParam.js';
import { useJobPolling } from './useJobPolling.js';

export function useEnhanceWorkflow() {
  const [file, setFile] = useState(null);
  const [model, setModel] = useState(null);
  const [scale, setScale] = useState(DEFAULT_SCALE);
  const [uploadProgress, setUploadProgress] = useState(null); // null when not uploading
  const [error, setError] = useState(null);
  const [jobId, setJobId] = useJobParam();
  const { job, error: pollError } = useJobPolling(jobId);
  const uploadRef = useRef(null);

  useEffect(() => () => uploadRef.current?.abort(), []);

  const selectFile = useCallback(
    (next) => {
      const problem = validateFile(next);
      setError(problem);
      if (problem) return;
      setFile(next);
      setJobId(null);
    },
    [setJobId],
  );

  const start = useCallback(async () => {
    if (!file || !model) return;
    setError(null);
    setUploadProgress(0);
    const upload = uploadImage({ file, model, scale, onProgress: setUploadProgress });
    uploadRef.current = upload;
    try {
      const created = await upload.promise;
      setJobId(created.id);
    } catch (err) {
      if (err.code !== 'ABORTED') setError(err.message);
    } finally {
      uploadRef.current = null;
      setUploadProgress(null);
    }
  }, [file, model, scale, setJobId]);

  const cancelUpload = useCallback(() => uploadRef.current?.abort(), []);

  const reset = useCallback(() => {
    setFile(null);
    setError(null);
    setJobId(null);
  }, [setJobId]);

  const phase = derivePhase({ uploadProgress, jobId, job, pollError });

  return {
    file, model, scale, job, phase, uploadProgress,
    error: error || pollError?.message || null,
    setModel, setScale, selectFile, start, cancelUpload, reset,
    canStart: Boolean(file && model) && (phase === 'idle' || phase === 'completed' || phase === 'failed'),
  };
}

function derivePhase({ uploadProgress, jobId, job, pollError }) {
  if (uploadProgress !== null) return 'uploading';
  if (!jobId) return 'idle';
  if (pollError) return 'failed';
  if (!job || job.id !== jobId) return 'loading';
  if (job.status === 'completed') return 'completed';
  if (job.status === 'failed') return 'failed';
  return job.status; // queued | processing
}
