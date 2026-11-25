import { Badge } from './Badge.jsx';

const TONES = { queued: 'neutral', processing: 'brand', completed: 'success', failed: 'danger' };

export function StatusBadge({ status }) {
  return <Badge tone={TONES[status] ?? 'neutral'} dot>{status}</Badge>;
}
