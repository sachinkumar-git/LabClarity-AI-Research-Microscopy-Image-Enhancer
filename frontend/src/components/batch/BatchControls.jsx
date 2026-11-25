/** Retry / cancel controls for a batch. Results come from the API; nothing is faked. */
import { Ban, FileText, RotateCcw } from 'lucide-react';
import { useState } from 'react';
import { assetUrl } from '../../api/imageApi.js';
import { cancelBatch, retryBatch } from '../../api/researchApi.js';
import { useToast } from '../../context/ToastContext.jsx';
import { Button } from '../common/Button.jsx';
import { downloadUrl } from '../common/ConfirmDialog.jsx';
import { Tooltip } from '../common/Tooltip.jsx';

export function BatchControls({ batchId, counts, reportLink, onChanged, size = 'sm' }) {
  const { notify } = useToast();
  const [busy, setBusy] = useState(null);

  const run = async (kind) => {
    setBusy(kind);
    try {
      if (kind === 'retry') {
        const { retried } = await retryBatch(batchId);
        notify(`${retried} failed run${retried === 1 ? '' : 's'} re-queued`);
      } else {
        const { cancelled, stillRunning } = await cancelBatch(batchId);
        const note = stillRunning ? ` · ${stillRunning} already processing will finish` : '';
        notify(`${cancelled} queued run${cancelled === 1 ? '' : 's'} cancelled${note}`, stillRunning ? 'info' : 'success');
      }
      onChanged?.();
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      <Tooltip label={counts.failed ? 'Re-queue every failed run' : 'No failed runs'}>
        <Button variant="secondary" size={size} icon={RotateCcw} disabled={!counts.failed} loading={busy === 'retry'} onClick={() => run('retry')}>
          Retry failed{counts.failed ? ` (${counts.failed})` : ''}
        </Button>
      </Tooltip>
      <Tooltip label={counts.queued ? 'Cancel runs that have not started' : 'Nothing queued'}>
        <Button variant="secondary" size={size} icon={Ban} disabled={!counts.queued} loading={busy === 'cancel'} onClick={() => run('cancel')}>
          Cancel queued{counts.queued ? ` (${counts.queued})` : ''}
        </Button>
      </Tooltip>
      <Button variant="secondary" size={size} icon={FileText} disabled={!counts.completed} onClick={() => downloadUrl(assetUrl(reportLink))}>
        PDF report
      </Button>
    </div>
  );
}
