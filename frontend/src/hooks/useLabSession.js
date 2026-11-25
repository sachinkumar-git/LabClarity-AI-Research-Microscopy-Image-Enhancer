/**
 * State machine for the Lab page: upload images -> review analysis -> build pipelines
 * -> optional ROI / reference -> start runs (single, comparison or batch).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { createRuns, uploadAssets } from '../api/researchApi.js';
import { recommendedPreset, toApiPipeline } from '../utils/pipeline.js';
import { validateFile } from '../utils/validateFile.js';

export const MAX_FILES = 10;

export function useLabSession() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [experimentId, setExperimentId] = useState(() => params.get('project') ?? '');
  const [assets, setAssets] = useState([]);
  const [selected, setSelected] = useState([]);
  const [pipelines, setPipelines] = useState([]);
  const [roi, setRoi] = useState(null);
  const [referenceId, setReferenceId] = useState('');
  const [uploadProgress, setUploadProgress] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const uploadRef = useRef(null);

  useEffect(() => () => uploadRef.current?.abort(), []);

  const upload = useCallback(async (files) => {
    const problems = files.map((f) => validateFile(f) && `${f.name}: ${validateFile(f)}`).filter(Boolean);
    if (problems.length) return setError(problems.join(' '));
    if (files.length > MAX_FILES) return setError(`Upload at most ${MAX_FILES} images at a time.`);
    setError(null);
    setUploadProgress(0);
    const request = uploadAssets({ files, experimentId: experimentId || undefined, onProgress: setUploadProgress });
    uploadRef.current = request;
    try {
      const created = await request.promise;
      setAssets((prev) => [...created, ...prev]);
      setSelected((prev) => [...created.map((a) => a.id), ...prev]);
      setPipelines((prev) => (prev.length ? prev : [recommendedPreset(created[0])].filter(Boolean)));
    } catch (err) {
      if (err.code !== 'ABORTED') setError(err.message);
    } finally {
      uploadRef.current = null;
      setUploadProgress(null);
    }
    return undefined;
  }, [experimentId]);

  const toggleSelected = useCallback((assetId) => {
    setSelected((prev) => (prev.includes(assetId) ? prev.filter((x) => x !== assetId) : [...prev, assetId]));
    setRoi(null);
  }, []);

  const changeExperiment = useCallback((id) => {
    setExperimentId(id);
    setAssets([]);
    setSelected([]);
    setRoi(null);
    setReferenceId('');
  }, []);

  const runCount = selected.length * pipelines.length;
  const blocked = useMemo(() => {
    if (!selected.length) return 'Select at least one image.';
    if (!pipelines.length) return 'Add at least one pipeline.';
    if (pipelines.some((p) => !p.steps.length)) return 'Every pipeline needs at least one step.';
    if (runCount > 60) return 'At most 60 runs per submission.';
    return null;
  }, [selected, pipelines, runCount]);

  const start = useCallback(async () => {
    if (blocked) return;
    setSubmitting(true);
    setError(null);
    try {
      const batch = await createRuns({
        assetIds: selected,
        pipelines: pipelines.map(toApiPipeline),
        roi: selected.length === 1 ? roi : null,
        referenceAssetId: referenceId || null,
        experimentId: experimentId || null,
      });
      navigate(`/batches/${batch.id}`);
    } catch (err) {
      setError(err.details?.length ? `${err.message}: ${err.details.join('; ')}` : err.message);
      setSubmitting(false);
    }
  }, [blocked, selected, pipelines, roi, referenceId, experimentId, navigate]);

  const selectedAssets = assets.filter((a) => selected.includes(a.id));
  return {
    experimentId, changeExperiment, assets, selected, selectedAssets, toggleSelected,
    pipelines, setPipelines, roi, setRoi, referenceId, setReferenceId,
    upload, cancelUpload: () => uploadRef.current?.abort(), uploadProgress,
    start, submitting, error, setError, runCount, blocked,
  };
}
