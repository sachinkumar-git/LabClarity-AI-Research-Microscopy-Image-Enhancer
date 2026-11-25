import { useState } from 'react';
import { createExperiment } from '../../api/researchApi.js';
import { Button } from '../common/Button.jsx';
import { Modal } from '../common/Modal.jsx';

const fieldCls = 'w-full rounded-xl border border-line bg-ink-950/60 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-brand-400/60 focus:outline-none';
const EMPTY = { name: '', description: '', tags: '' };

/** Creates a project (stored as an experiment on the server). */
export function NewProjectModal({ open, onClose, onCreated }) {
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const tags = form.tags.split(',').map((t) => t.trim()).filter(Boolean).slice(0, 10);
      const project = await createExperiment({ name: form.name.trim(), description: form.description.trim(), tags });
      setForm(EMPTY);
      onCreated(project);
      onClose();
    } catch (err) {
      setError(err.details?.join('; ') || err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="New project" description="Projects keep images, runs and reports together. Their data never auto-expires.">
      <form onSubmit={submit} className="space-y-3">
        <input required maxLength={120} value={form.name} onChange={set('name')} placeholder="Name, e.g. Neuron spines 100x" aria-label="Project name" className={fieldCls} />
        <textarea maxLength={2000} rows={3} value={form.description} onChange={set('description')} placeholder="Sample, microscope, objective, acquisition settings…" aria-label="Description" className={fieldCls} />
        <input maxLength={300} value={form.tags} onChange={set('tags')} placeholder="Tags, comma separated (confocal, live-cell)" aria-label="Tags" className={fieldCls} />
        {error && <p className="text-xs text-rose-300">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={busy} disabled={!form.name.trim()}>Create project</Button>
        </div>
      </form>
    </Modal>
  );
}
