import { useState } from 'react';
import { FolderPlus } from 'lucide-react';
import { createExperiment, listExperiments } from '../../api/researchApi.js';
import { useApi } from '../../hooks/useApi.js';
import { Button } from '../common/Button.jsx';

const inputCls =
  'h-10 w-full rounded-xl border border-line bg-ink-950/60 px-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-brand-400/60 focus:outline-none';

/** Chooses (or creates) the experiment new uploads belong to. */
export function ExperimentPicker({ value, onChange, disabled }) {
  const { data: experiments = [], reload, setData } = useApi(listExperiments, 'experiments');
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [error, setError] = useState(null);

  const create = async () => {
    try {
      const experiment = await createExperiment({ name: name.trim() });
      setData([experiment, ...(experiments ?? [])]);
      onChange(experiment.id);
      setCreating(false);
      setName('');
      setError(null);
    } catch (err) {
      setError(err.message);
      reload();
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <select
          aria-label="Project"
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className={inputCls}
        >
          <option value="">No project: ad-hoc, auto-deleted after 24 h</option>
          {(experiments ?? []).map((e) => (
            <option key={e.id} value={e.id}>
              {e.name} ({e.imageCount} images, {e.runCount} runs)
            </option>
          ))}
        </select>
        <Button variant="secondary" icon={FolderPlus} onClick={() => setCreating((c) => !c)} disabled={disabled} aria-label="New project" title="New project" />
      </div>
      {creating && (
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (name.trim()) create();
          }}
        >
          <input autoFocus maxLength={120} value={name} onChange={(e) => setName(e.target.value)} placeholder="Project name, e.g. HeLa mitochondria 63x" aria-label="New project name" className={inputCls} />
          <Button type="submit" disabled={!name.trim()}>Create</Button>
        </form>
      )}
      {error && <p className="text-xs text-rose-300">{error}</p>}
      <p className="text-xs text-slate-500">
        {value ? 'Images and runs in a project are kept until you delete them.' : 'Choose a project to keep results and history.'}
      </p>
    </div>
  );
}
