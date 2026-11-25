import { useState } from 'react';
import { FileText, Pencil, Trash2, Wand2 } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router';
import { assetUrl } from '../api/imageApi.js';
import { deleteExperiment, getExperiment, updateExperiment } from '../api/researchApi.js';
import { Alert } from '../components/common/Alert.jsx';
import { Badge } from '../components/common/Badge.jsx';
import { Button } from '../components/common/Button.jsx';
import { ConfirmDialog } from '../components/common/ConfirmDialog.jsx';
import { PageSkeleton } from '../components/common/Skeleton.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { Panel } from '../components/common/Panel.jsx';
import { AnalysisSummary } from '../components/lab/AnalysisSummary.jsx';
import { RunHistoryTable } from '../components/experiments/RunHistoryTable.jsx';
import { useApi } from '../hooks/useApi.js';

function EditForm({ experiment, onSaved, onCancel }) {
  const [name, setName] = useState(experiment.name);
  const [description, setDescription] = useState(experiment.description);
  const save = async (e) => {
    e.preventDefault();
    onSaved(await updateExperiment(experiment.id, { name: name.trim(), description }));
  };
  const cls = 'w-full rounded-xl border border-line bg-ink-950/60 px-3 py-2 text-sm text-slate-100 focus:border-brand-400/60 focus:outline-none';
  return (
    <form onSubmit={save} className="space-y-2">
      <input required maxLength={120} value={name} onChange={(e) => setName(e.target.value)} className={cls} aria-label="Name" />
      <textarea maxLength={2000} rows={3} value={description} onChange={(e) => setDescription(e.target.value)} className={cls} aria-label="Description" />
      <div className="flex gap-2"><Button type="submit" size="sm">Save</Button><Button variant="ghost" size="sm" onClick={onCancel}>Cancel</Button></div>
    </form>
  );
}

export function ProjectPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: exp, error, setData } = useApi((signal) => getExperiment(id, signal), id);
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const { notify } = useToast();

  if (error) return <main className="mx-auto max-w-3xl px-4 py-16"><Alert tone="error" title="Project not available">{error.message}</Alert></main>;
  if (!exp) return <PageSkeleton />;

  return (
    <main className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 max-w-3xl flex-1">
          {editing ? (
            <EditForm experiment={exp} onCancel={() => setEditing(false)} onSaved={(saved) => { setData({ ...exp, ...saved }); setEditing(false); notify('Project updated'); }} />
          ) : (
            <>
              <h1 className="text-2xl font-semibold text-white">{exp.name}</h1>
              <p className="mt-1 text-sm whitespace-pre-line text-slate-400">{exp.description || 'No description'}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">{exp.tags.map((t) => <Badge key={t} tone="accent">{t}</Badge>)}</div>
            </>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button as={Link} to={`/enhance?project=${exp.id}`} icon={Wand2}>Enhance images here</Button>
          {exp.runCount > 0 && <Button as="a" variant="secondary" href={assetUrl(exp.links.report)} icon={FileText}>PDF report</Button>}
          <Button variant="ghost" icon={Pencil} onClick={() => setEditing(true)}>Edit</Button>
          <Button variant="danger" icon={Trash2} onClick={() => setConfirming(true)}>Delete</Button>
        </div>
      </header>

      <Panel title={`Source images (${exp.images.length})`} subtitle="Originals are stored read-only and fingerprinted with SHA-256">
        {exp.images.length === 0 && <p className="text-sm text-slate-500">No images yet. Use “Enhance images here” to upload into this project.</p>}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {exp.images.map((img) => (
            <article key={img.id} className="rounded-xl border border-line bg-ink-950/40 p-3">
              <div className="flex gap-3">
                <img src={assetUrl(img.links.preview)} alt="" className="checkerboard size-16 rounded-lg object-cover ring-1 ring-white/10" />
                <div className="min-w-0">
                  <p className="truncate text-sm text-white" title={img.originalName}>{img.originalName}</p>
                  <p className="mt-1 font-mono text-[10px] text-slate-500">sha256 {img.sha256.slice(0, 16)}…</p>
                </div>
              </div>
              <div className="mt-3"><AnalysisSummary analysis={img.analysis} recommendation={null} /></div>
            </article>
          ))}
        </div>
      </Panel>

      <Panel title={`Restoration history (${exp.runCount})`}><RunHistoryTable runs={exp.runs} /></Panel>
      <ConfirmDialog
        open={confirming} onClose={() => setConfirming(false)}
        title={`Delete "${exp.name}"?`} description={`Removes ${exp.imageCount} images and ${exp.runCount} runs with all files.`}
        onConfirm={async () => { await deleteExperiment(id); notify(`Deleted project "${exp.name}"`); navigate('/projects'); }}
      />
    </main>
  );
}
