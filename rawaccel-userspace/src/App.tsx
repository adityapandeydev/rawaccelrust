import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Activity, Mouse, Settings } from 'lucide-react';
import { LiveInput } from './components/MouseTelemetry';
import { useApplySettings } from './hooks/useApplySettings';
import { useDriverStatus } from './hooks/useDriverStatus';
import { useDevices } from './hooks/useDevices';
import { useProfileEditor } from './hooks/useProfileEditor';
import { useSettingsTransfer } from './hooks/useSettingsTransfer';
import { usePreferences } from './hooks/usePreferences';
import { useNotifications } from './hooks/useNotifications';
import { useWindowState } from './hooks/useWindowState';
import { useUnsavedChanges } from './hooks/useUnsavedChanges';
import { serializeSettingsDocument } from './settingsDocument';
import { validateSettings } from './validation';
import { defaultProfile, type Profile } from './types';
import { documentStatus } from './documentStatus';
import { CurvePage } from './ui/CurvePage';
import { DevicesPage } from './ui/DevicesPage';
import { SettingsPage, type SettingsTab } from './ui/SettingsPage';
import { AddProfileButton, ApplyButton, DriverChip, ProfileMenu, ProfileTabs, ThemeToggle } from './ui/TopBar';
import { Modal, Toast } from './ui/Overlays';
import './styles/app.css';

type Page = 'curve' | 'devices' | 'settings';
type Confirmation = { title: string; message: string; action: () => void; label: string };
const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const NAV: { id: Page; label: string; Icon: typeof Activity }[] = [
  { id: 'curve', label: 'Curve', Icon: Activity },
  { id: 'devices', label: 'Devices', Icon: Mouse },
  { id: 'settings', label: 'Settings', Icon: Settings },
];

function App() {
  useWindowState();
  const driverStatus = useDriverStatus();
  const { devices, loading, error, refresh } = useDevices();
  const preferences = usePreferences();
  const { notification, toast, notify, dismiss, dismissToast } = useNotifications(preferences.showToastNotifications);
  const editor = useProfileEditor(notify);
  const apply = useApplySettings(editor, driverStatus, notify);
  const [page, setPage] = useState<Page>('curve');
  const [shown, setShown] = useState<Page>('curve');
  const [leaving, setLeaving] = useState(false);
  const [settingsTab, setSettingsTab] = useState<SettingsTab>('general');
  const [renaming, setRenaming] = useState<number | null>(null);
  const [live, setLive] = useState(true);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const navTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const railIndicator = useRef<HTMLSpanElement>(null);
  const importInput = useRef<HTMLInputElement>(null);

  const confirmProfileAction = (request: Confirmation) => {
    if (preferences.showConfirmModals) setConfirmation(request);
    else request.action();
  };
  const current = serializeSettingsDocument(editor.settingsMetadata, editor.profiles, editor.deviceConfig);
  const status = documentStatus(current, editor.savedSnapshot, editor.snapshotOrigin, apply.appliedSnapshot);
  const guard = useUnsavedChanges(status.edited, apply.isApplying, (action, reason) => setConfirmation({
    title: reason === 'close' ? 'Discard unsaved edits?' : 'Replace unsaved edits?',
    label: reason === 'close' ? 'Discard edits & close' : 'Replace edits',
    message: reason === 'close' ? 'Closing RawAccel will discard unsaved edits. Export them or use Apply & Save to keep them.'
      : 'Loading this file will replace unsaved profiles and device settings. Export them or use Apply & Save first if you want to keep them.',
    action,
  }), notify);
  const transfer = useSettingsTransfer(editor, notify, guard.confirmReplace);
  const validationError = validateSettings(editor.profiles, editor.deviceConfig, editor.settingsMetadata.default_device_config);
  const disabledReason = validationError ?? apply.applyDisabledReason;
  const tieredApplyEnabled = driverStatus.report?.tiered_apply_enabled === true;

  // Profiles that differ from the saved document get a dot on their tab.
  const savedProfiles = useMemo<Profile[]>(() => {
    try { return editor.savedSnapshot ? JSON.parse(editor.savedSnapshot).profiles ?? [] : []; } catch { return []; }
  }, [editor.savedSnapshot]);
  const dirty = useMemo(() => new Set(editor.profiles.filter(profile => {
    const saved = savedProfiles.find(item => item.id === profile.id);
    return !saved || JSON.stringify(saved) !== JSON.stringify(profile);
  }).map(profile => profile.id)), [editor.profiles, savedProfiles]);

  // The old page fades out, then the new one rises in; rapid clicks keep only the last.
  const navigate = (next: Page) => {
    if (next === page) return;
    setPage(next);
    if (navTimer.current) clearTimeout(navTimer.current);
    if (reducedMotion()) { setShown(next); return; }
    setLeaving(true);
    navTimer.current = setTimeout(() => { setShown(next); setLeaving(false); navTimer.current = null; }, 140);
  };
  useEffect(() => () => { if (navTimer.current) clearTimeout(navTimer.current); }, []);
  useLayoutEffect(() => {
    const place = () => {
      const button = document.querySelector<HTMLElement>(`.rail-btn[data-nav="${page}"]`);
      const indicator = railIndicator.current;
      const rail = indicator?.parentElement;
      if (!button || !indicator || !rail) return;
      // Sub-pixel geometry: offsetLeft would round a half-pixel centring offset.
      const r = rail.getBoundingClientRect(), box = button.getBoundingClientRect();
      const left = box.left - r.left - rail.clientLeft, top = box.top - r.top - rail.clientTop;
      indicator.style.transform = `translate(${left}px, ${top}px)`;
      indicator.style.width = `${box.width}px`;
      indicator.style.height = `${box.height}px`;
      indicator.style.setProperty('--bar', `${-left}px`);
    };
    place();
    window.addEventListener('resize', place);
    return () => window.removeEventListener('resize', place);
  }, [page]);

  const reset = () => confirmProfileAction({ title: 'Reset this profile?', label: 'Reset profile',
    message: 'Restore the active profile’s curve and advanced parameters to their defaults. Its name and device mappings will stay in place. Apply & save when you are ready.',
    action: () => editor.updateActiveProfile(profile => ({ ...defaultProfile(profile.name), id: profile.id })) });
  const revert = () => confirmProfileAction({ title: 'Revert unsaved edits?', label: 'Revert edits',
    message: 'Restore all profiles and device settings to the last document loaded or saved in this session. This does not send anything to the driver.',
    action: () => {
      if (!editor.savedSnapshot) return;
      const snapshot = editor.savedSnapshot;
      const saved = editor.snapshotOrigin === 'saved';
      editor.replaceDocument(JSON.parse(snapshot));
      if (saved) editor.markSaved(snapshot);
    } });
  const remove = () => {
    const index = editor.activeProfileIndex, name = editor.activeProfile.name;
    confirmProfileAction({ title: `Delete ${name}?`, label: 'Delete profile',
      message: 'Remove this profile and clear its device mappings. Apply & save when you are ready.', action: () => editor.deleteProfile(index) });
  };

  return <div className="window">
    <div className="brand" aria-hidden="true">
      <svg viewBox="0 0 26 26"><rect x="1" y="1" width="24" height="24" rx="7" fill="var(--accent)" /><path d="M6 19c5 0 7-1.5 9-5s3-6 5-7" fill="none" stroke="var(--accent-fg)" strokeWidth="2.2" strokeLinecap="round" /><circle cx="15" cy="14" r="1.9" fill="var(--accent-fg)" /></svg>
    </div>

    <header className="topbar">
      <div className="profiles-wrap">
        <ProfileTabs profiles={editor.profiles} active={editor.activeProfileIndex} dirty={dirty} renaming={renaming} setRenaming={setRenaming}
          onSelect={index => { if (index !== editor.activeProfileIndex) editor.selectProfile(index); }}
          onRename={(_, name) => editor.renameProfile(name)} />
        <AddProfileButton count={editor.profiles.length} onAdd={() => { if (editor.addProfile()) navigate('curve'); }} />
        <ProfileMenu count={editor.profiles.length} activeName={editor.activeProfile.name}
          onRename={() => setRenaming(editor.activeProfileIndex)} onDuplicate={() => editor.duplicateProfile(editor.activeProfileIndex)}
          onReset={reset} onDelete={remove} />
      </div>
      <div className="top-actions">
        <DriverChip snapshot={driverStatus} onOpen={() => { setSettingsTab('driver'); navigate('settings'); }} />
        <ThemeToggle dark={preferences.resolvedTheme === 'dark'}
          onToggle={origin => preferences.switchTheme(preferences.resolvedTheme === 'dark' ? 'light' : 'dark', origin)} />
        <ApplyButton onApply={apply.applySettings} disabledReason={apply.isApplying ? 'Applying…' : disabledReason}
          onBlocked={reason => { if (!apply.isApplying) notify({ isOpen: true, title: 'Settings Were Not Applied', message: reason }); }} />
      </div>
    </header>

    <nav className="rail" aria-label="Main navigation">
      <span className="rail-ind" ref={railIndicator} aria-hidden="true" />
      {NAV.map(({ id, label, Icon }) => <button key={id} type="button" className="rail-btn" data-nav={id}
        aria-current={page === id ? 'page' : undefined} onClick={() => navigate(id)}><Icon size={19} aria-hidden="true" />{label}</button>)}
    </nav>

    <main className="stage">
      <div key={shown} className={`page-host ${leaving ? 'page-out' : 'page-in'}`}>
        {shown === 'curve' && <CurvePage editor={editor} notify={notify} devices={devices} devicesLoading={loading} tieredApplyEnabled={tieredApplyEnabled}
          live={live} appearance={`${preferences.palette}-${preferences.resolvedTheme}`} onAssign={() => navigate('devices')} />}
        {shown === 'devices' && <DevicesPage editor={editor} devices={devices} loading={loading} error={error} onRefresh={refresh} tieredApplyEnabled={tieredApplyEnabled} />}
        {shown === 'settings' && <SettingsPage tab={settingsTab} onTab={setSettingsTab} theme={preferences.theme} palette={preferences.palette}
          onMode={(theme, origin) => preferences.switchTheme(theme, origin)} onPalette={(id, origin) => preferences.switchPalette(id, origin)}
          showToastNotifications={preferences.showToastNotifications} setShowToastNotifications={preferences.setShowToastNotifications}
          showConfirmModals={preferences.showConfirmModals} setShowConfirmModals={preferences.setShowConfirmModals}
          onImport={() => importInput.current?.click()} onExport={transfer.exportSettings}
          driverStatus={driverStatus} onRefreshDriver={driverStatus.refresh} />}
      </div>
    </main>

    <footer className="statusbar">
      <span className={`doc ${status.edited ? 'dirty' : ''}`}><i aria-hidden="true" /><b className="document-status">{status.disk}</b></span>
      <span className="driver-state">{status.driver}</span>
      {status.edited && editor.savedSnapshot && <button type="button" className="link-btn" onClick={revert}>Revert to saved</button>}
      {disabledReason && <span className="reason" role={validationError ? 'alert' : 'status'} title={disabledReason}>{disabledReason}</span>}
      <span className="grow" />
      <LiveInput whole={editor.linkXY} />
      <button type="button" className="link-btn" aria-pressed={!live} onClick={() => setLive(value => !value)}
        title={live ? 'Hide the live-input dot on the graph' : 'Show the live-input dot on the graph'}>{live ? 'Pause' : 'Resume'}</button>
    </footer>

    <input ref={importInput} type="file" accept=".json" id="import-settings-upload" hidden
      onChange={async event => {
        const control = event.currentTarget;
        const file = control.files?.[0];
        if (!file) return;
        await transfer.importSettings(file);
        control.value = '';
      }} />
    <Toast toast={toast} onDismiss={dismissToast} />
    <Modal isOpen={confirmation !== null || notification.isOpen} title={confirmation?.title ?? notification.title} message={confirmation?.message ?? notification.message}
      onClose={() => { if (confirmation) setConfirmation(null); else dismiss(); }} onConfirm={confirmation?.action} confirmLabel={confirmation?.label} />
  </div>;
}
export default App;
