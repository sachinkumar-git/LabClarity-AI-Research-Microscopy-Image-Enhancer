/** Per-run action menu used in History: every item calls a real endpoint or navigates. */
import { Download, ExternalLink, FileText, MoreHorizontal, RotateCcw, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router';
import { assetUrl } from '../../api/imageApi.js';
import { retryRun } from '../../api/researchApi.js';
import { useToast } from '../../context/ToastContext.jsx';
import { downloadUrl } from '../common/ConfirmDialog.jsx';
import { Dropdown, MenuItem } from '../common/Dropdown.jsx';

export function RunActions({ run, onChanged, onDelete }) {
  const navigate = useNavigate();
  const { notify } = useToast();
  const done = run.status === 'completed';

  const retry = async () => {
    try {
      await retryRun(run.id);
      notify('Run re-queued');
      onChanged();
    } catch (err) {
      notify(err.message, 'error');
    }
  };

  return (
    <Dropdown
      width="w-52"
      trigger={(props) => (
        <button {...props} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-white/5 hover:text-white" aria-label={`Actions for ${run.label ?? run.model}`}>
          <MoreHorizontal className="size-4.5" />
        </button>
      )}
    >
      {(close) => (
        <>
          <MenuItem icon={ExternalLink} close={close} onSelect={() => navigate(`/runs/${run.id}`)}>Open details</MenuItem>
          <MenuItem icon={Download} close={close} disabled={!done} onSelect={() => downloadUrl(assetUrl(run.links.enhanced, { download: true }))}>Download output</MenuItem>
          <MenuItem icon={FileText} close={close} disabled={!done} onSelect={() => downloadUrl(assetUrl(run.links.report))}>PDF report</MenuItem>
          <MenuItem icon={RotateCcw} close={close} disabled={run.status !== 'failed'} hint={run.status === 'failed' ? undefined : 'Only failed runs'} onSelect={retry}>Retry</MenuItem>
          <MenuItem icon={Trash2} close={close} danger disabled={run.status === 'processing'} onSelect={() => onDelete(run)}>Delete run</MenuItem>
        </>
      )}
    </Dropdown>
  );
}
