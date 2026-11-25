/** Confirmation for destructive actions; shows the API error inline if the action fails. */
import { useState } from 'react';
import { Button } from './Button.jsx';
import { Modal } from './Modal.jsx';

export function ConfirmDialog({ open, onClose, title, description, confirmLabel = 'Delete', onConfirm }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const confirm = async () => {
    setBusy(true);
    setError(null);
    try {
      await onConfirm();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={busy ? () => {} : onClose}
      title={title}
      description={description}
      footer={(
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button variant="danger" onClick={confirm} loading={busy}>{confirmLabel}</Button>
        </>
      )}
    >
      {error && <p className="rounded-lg bg-rose-500/10 p-3 text-sm text-rose-300">{error}</p>}
      {!error && <p className="text-sm text-slate-400">This cannot be undone.</p>}
    </Modal>
  );
}

/** Triggers a browser download for a same-origin URL (PDF reports, PNG outputs). */
export function downloadUrl(url) {
  const a = document.createElement('a');
  a.href = url;
  a.download = '';
  document.body.appendChild(a);
  a.click();
  a.remove();
}
