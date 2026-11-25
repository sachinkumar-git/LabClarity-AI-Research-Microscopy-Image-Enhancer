import { ArrowRight, FileText, Folder, FolderOpen, MoreHorizontal, Trash2, Wand2 } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { assetUrl } from '../../api/imageApi.js';
import { deleteExperiment, getExperiment, listExperiments } from '../../api/researchApi.js';
import { useToast } from '../../context/ToastContext.jsx';
import { useApi } from '../../hooks/useApi.js';
import { timeAgo } from '../../utils/format.js';
import { ConfirmDialog, downloadUrl } from '../common/ConfirmDialog.jsx';
import { Dropdown, MenuItem } from '../common/Dropdown.jsx';
import { Skeleton } from '../common/Skeleton.jsx';

async function loadRecent(signal) {
  const all = await listExperiments(signal);
  const top = all.slice(0, 3);
  const details = await Promise.all(top.map((e) => getExperiment(e.id, signal).catch(() => null)));
  return top.map((e, i) => ({ ...e, cover: details[i]?.images?.[0]?.links.preview ?? null }));
}

function ProjectRow({ project, onDelete }) {
  const navigate = useNavigate();
  return (
    <li className="group flex items-center gap-3 border-t border-line py-2.5 first:border-t-0">
      <Link to={`/projects/${project.id}`} className="flex min-w-0 flex-1 items-center gap-3 rounded-lg">
        <span className="checkerboard grid size-12 shrink-0 place-items-center overflow-hidden rounded-lg ring-1 ring-line">
          {project.cover ? <img src={assetUrl(project.cover)} alt="" className="size-full object-cover transition-transform duration-300 group-hover:scale-110" /> : <Folder className="size-5 text-slate-500" aria-hidden />}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold text-white group-hover:text-brand-300">{project.name}</span>
          <span className="block text-xs text-slate-500">{project.imageCount} image{project.imageCount === 1 ? '' : 's'} · Updated {timeAgo(project.updatedAt)}</span>
        </span>
      </Link>
      <Dropdown
        width="w-52"
        trigger={(props) => (
          <button {...props} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-white/5 hover:text-white" aria-label={`Actions for ${project.name}`}>
            <MoreHorizontal className="size-4.5" />
          </button>
        )}
      >
        {(close) => (
          <>
            <MenuItem icon={FolderOpen} close={close} onSelect={() => navigate(`/projects/${project.id}`)}>Open project</MenuItem>
            <MenuItem icon={Wand2} close={close} onSelect={() => navigate(`/enhance?project=${project.id}`)}>Enhance images here</MenuItem>
            <MenuItem icon={FileText} close={close} disabled={!project.runCount} hint={project.runCount ? undefined : 'No runs yet'} onSelect={() => downloadUrl(assetUrl(project.links.report))}>Download PDF report</MenuItem>
            <MenuItem icon={Trash2} close={close} danger onSelect={() => onDelete(project)}>Delete project</MenuItem>
          </>
        )}
      </Dropdown>
    </li>
  );
}

export function RecentProjects() {
  const { data, loading, error, reload } = useApi(loadRecent, 'recent');
  const { notify } = useToast();
  const [pending, setPending] = useState(null);

  return (
    <section className="glass flex flex-col p-5">
      <header className="mb-2 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-brand-400/10 text-brand-400"><Folder className="size-5" aria-hidden /></span>
          <div>
            <h2 className="text-base font-semibold text-white">Recent Projects</h2>
            <p className="text-xs text-slate-500">Continue your research work</p>
          </div>
        </div>
        <Link to="/projects" className="group flex items-center gap-1 text-xs font-medium text-brand-300 hover:underline">
          View All <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
        </Link>
      </header>
      {loading && !data && <div className="space-y-3 py-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-12 w-full" />)}</div>}
      {error && <p className="py-4 text-sm text-rose-300">{error.message}</p>}
      {data?.length === 0 && (
        <p className="py-6 text-center text-sm text-slate-500">No projects yet. <Link to="/projects" className="text-brand-300 hover:underline">Create one</Link></p>
      )}
      <ul>{(data ?? []).map((p) => <ProjectRow key={p.id} project={p} onDelete={setPending} />)}</ul>
      <ConfirmDialog
        open={Boolean(pending)}
        onClose={() => setPending(null)}
        title={`Delete "${pending?.name}"?`}
        description={`Removes ${pending?.imageCount ?? 0} images and ${pending?.runCount ?? 0} runs with all files.`}
        onConfirm={async () => {
          await deleteExperiment(pending.id);
          notify(`Deleted project "${pending.name}"`);
          reload();
        }}
      />
    </section>
  );
}
