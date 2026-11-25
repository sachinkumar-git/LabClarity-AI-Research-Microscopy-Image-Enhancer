import { FileText, FolderOpen, MoreHorizontal, Plus, Search, Trash2, Wand2 } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { assetUrl } from '../api/imageApi.js';
import { deleteExperiment, listExperiments } from '../api/researchApi.js';
import { Alert } from '../components/common/Alert.jsx';
import { Badge } from '../components/common/Badge.jsx';
import { Button } from '../components/common/Button.jsx';
import { ConfirmDialog, downloadUrl } from '../components/common/ConfirmDialog.jsx';
import { Dropdown, MenuItem } from '../components/common/Dropdown.jsx';
import { SkeletonGrid } from '../components/common/Skeleton.jsx';
import { Reveal, Stagger, StaggerItem } from '../components/motion/Reveal.jsx';
import { NewProjectModal } from '../components/projects/NewProjectModal.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useApi } from '../hooks/useApi.js';
import { timeAgo } from '../utils/format.js';

function ProjectCard({ project, onDelete }) {
  const navigate = useNavigate();
  return (
    <StaggerItem className="glass card-interactive relative flex flex-col p-5">
      <div className="flex items-start justify-between gap-2">
        <Link to={`/projects/${project.id}`} className="min-w-0 after:absolute after:inset-0">
          <h2 className="truncate font-semibold text-white">{project.name}</h2>
        </Link>
        <div className="relative z-10">
          <Dropdown width="w-52" trigger={(props) => (
            <button {...props} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-white/5 hover:text-white" aria-label={`Actions for ${project.name}`}><MoreHorizontal className="size-4.5" /></button>
          )}>
            {(close) => (
              <>
                <MenuItem icon={FolderOpen} close={close} onSelect={() => navigate(`/projects/${project.id}`)}>Open project</MenuItem>
                <MenuItem icon={Wand2} close={close} onSelect={() => navigate(`/enhance?project=${project.id}`)}>Enhance images here</MenuItem>
                <MenuItem icon={FileText} close={close} disabled={!project.runCount} onSelect={() => downloadUrl(assetUrl(project.links.report))}>Download PDF report</MenuItem>
                <MenuItem icon={Trash2} close={close} danger onSelect={() => onDelete(project)}>Delete project</MenuItem>
              </>
            )}
          </Dropdown>
        </div>
      </div>
      <p className="mt-1 line-clamp-2 min-h-10 text-sm text-slate-400">{project.description || 'No description'}</p>
      <div className="mt-3 flex min-h-6 flex-wrap gap-1.5">{project.tags.map((t) => <Badge key={t} tone="accent">{t}</Badge>)}</div>
      <p className="mt-3 text-xs text-slate-500">{project.imageCount} image{project.imageCount === 1 ? '' : 's'} · {project.runCount} run{project.runCount === 1 ? '' : 's'} · updated {timeAgo(project.updatedAt)}</p>
    </StaggerItem>
  );
}

export function ProjectsPage() {
  const { data, error, loading, reload } = useApi(listExperiments, 'projects');
  const { notify } = useToast();
  const [query, setQuery] = useState('');
  const [tag, setTag] = useState('');
  const [creating, setCreating] = useState(false);
  const [pending, setPending] = useState(null);
  const projects = data ?? [];
  const tags = [...new Set(projects.flatMap((p) => p.tags))].sort();
  const q = query.trim().toLowerCase();
  const shown = projects.filter((p) => (!tag || p.tags.includes(tag)) && (!q || `${p.name} ${p.description}`.toLowerCase().includes(q)));

  return (
    <main className="mx-auto max-w-[1440px] space-y-6 px-4 py-8 sm:px-6">
      <Reveal as="header" className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Projects</h1>
          <p className="mt-1 text-sm text-slate-400">Organise source images, processing runs and reports by research question.</p>
        </div>
        <Button icon={Plus} onClick={() => setCreating(true)}>New project</Button>
      </Reveal>
      <div className="flex flex-wrap items-center gap-2">
        <label className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-500" aria-hidden />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search projects" aria-label="Search projects" className="h-10 w-full rounded-xl border border-line bg-ink-900/70 pr-3 pl-9 text-sm text-slate-100 placeholder:text-slate-500 focus:border-brand-400/60 focus:outline-none" />
        </label>
        {tags.map((t) => (
          <button key={t} type="button" aria-pressed={tag === t} onClick={() => setTag(tag === t ? '' : t)}
            className={`rounded-full px-3 py-1 text-xs font-medium ring-1 transition-all duration-200 active:scale-95 ${tag === t ? 'bg-brand-600 text-on-brand ring-brand-600' : 'text-slate-300 ring-line hover:ring-brand-400/40'}`}>
            {t}
          </button>
        ))}
      </div>
      {error && <Alert tone="error">{error.message}</Alert>}
      {loading && !data && <SkeletonGrid count={6} item="h-44" />}
      {data && shown.length === 0 && <p className="py-10 text-center text-sm text-slate-500">{projects.length ? 'No projects match your filters.' : 'No projects yet. Create one to get started.'}</p>}
      <Stagger key={`${q}-${tag}-${projects.length}`} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map((p) => <ProjectCard key={p.id} project={p} onDelete={setPending} />)}
      </Stagger>
      <NewProjectModal open={creating} onClose={() => setCreating(false)} onCreated={(p) => { notify(`Project "${p.name}" created`); reload(); }} />
      <ConfirmDialog
        open={Boolean(pending)} onClose={() => setPending(null)}
        title={`Delete "${pending?.name}"?`} description={`Removes ${pending?.imageCount ?? 0} images and ${pending?.runCount ?? 0} runs with all files.`}
        onConfirm={async () => { await deleteExperiment(pending.id); notify(`Deleted project "${pending.name}"`); reload(); }}
      />
    </main>
  );
}
