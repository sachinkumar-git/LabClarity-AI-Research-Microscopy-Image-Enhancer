/** Workspace settings (browser-local preferences; there are no user accounts). */
import { Monitor, Moon, Sun } from 'lucide-react';
import { useCatalog } from '../../context/CatalogContext.jsx';
import { useSettings } from '../../context/SettingsContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { Button } from '../common/Button.jsx';
import { Modal } from '../common/Modal.jsx';
import { SegmentedControl } from '../common/SegmentedControl.jsx';

const fieldCls = 'h-10 w-full rounded-xl border border-line bg-ink-950/60 px-3 text-sm text-slate-100 focus:border-brand-400/60 focus:outline-none';

function Field({ label, hint, children }) {
  return (
    <div className="space-y-1.5">
      <p className="text-sm font-medium text-slate-200">{label}</p>
      {children}
      {hint && <p className="text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

export function SettingsModal({ open, onClose }) {
  const { prefs, update, reset } = useSettings();
  const { models } = useCatalog();
  const { notify } = useToast();
  const srModels = models.filter((m) => m.task === 'super_resolution');

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Workspace settings"
      description="Stored in this browser only. LabClarity has no user accounts."
      footer={(
        <>
          <Button variant="ghost" onClick={() => { reset(); notify('Preferences reset to defaults', 'info'); }}>Reset to defaults</Button>
          <Button onClick={onClose}>Done</Button>
        </>
      )}
    >
      <div className="space-y-5">
        <Field label="Theme">
          <SegmentedControl
            label="Theme"
            value={prefs.theme}
            onChange={(theme) => update({ theme })}
            options={[
              { value: 'light', label: 'Light', icon: Sun },
              { value: 'dark', label: 'Dark', icon: Moon },
              { value: 'system', label: 'System', icon: Monitor },
            ]}
          />
        </Field>
        <Field label="Motion" hint="System follows your operating system's reduced-motion setting.">
          <SegmentedControl
            label="Motion"
            value={prefs.motion}
            onChange={(motion) => update({ motion })}
            options={[
              { value: 'system', label: 'System' },
              { value: 'reduce', label: 'Reduced' },
              { value: 'full', label: 'Full' },
            ]}
          />
        </Field>
        <Field label="Default super-resolution model" hint="Used when you add a super-resolution step in Enhance.">
          <select aria-label="Default super-resolution model" value={prefs.defaultSrModel} onChange={(e) => update({ defaultSrModel: e.target.value })} className={fieldCls}>
            <option value="">Best available (automatic)</option>
            {srModels.map((m) => (
              <option key={m.id} value={m.id} disabled={!m.available}>{m.name}{m.available ? '' : ' (setup required)'}</option>
            ))}
          </select>
        </Field>
        <Field label="Display name" hint="Shown as initials in the header and on this device only.">
          <input maxLength={40} value={prefs.displayName} onChange={(e) => update({ displayName: e.target.value })} placeholder="e.g. Sachin Kumar" className={fieldCls} aria-label="Display name" />
        </Field>
      </div>
    </Modal>
  );
}
