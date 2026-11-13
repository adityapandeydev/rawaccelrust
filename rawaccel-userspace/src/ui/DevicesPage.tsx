import { useEffect, useState, type CSSProperties } from 'react';
import { Mouse, RefreshCw } from 'lucide-react';
import type { Device, DeviceConfig } from '../types';
import type { ProfileEditor } from '../hooks/useProfileEditor';
import { deviceEntries, patchDevice, type DeviceDefaults, type DeviceEntry } from '../deviceState';
import { Callout, Check, Field } from './controls';

const DEFAULTS_ID = '__defaults';

export function DevicesPage({ editor, devices, loading, error, onRefresh, tieredApplyEnabled }: {
  editor: ProfileEditor; devices: Device[]; loading: boolean; error: string | null; onRefresh: () => Promise<void>; tieredApplyEnabled: boolean;
}) {
  const entries = deviceEntries(devices, editor.deviceConfig);
  const [selected, setSelected] = useState<string>(() => devices[0]?.id ?? DEFAULTS_ID);
  const [spin, setSpin] = useState(0);
  // Keep a valid selection when mice connect or disconnect.
  useEffect(() => {
    setSelected(current => current === DEFAULTS_ID || entries.some(entry => entry.id === current) ? current : entries[0]?.id ?? DEFAULTS_ID);
  }, [devices, editor.deviceConfig.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const entry = entries.find(item => item.id === selected);
  const patch = (id: string, change: Partial<DeviceConfig>) => editor.setDeviceConfig(previous => patchDevice(previous, id, change));

  return <section className="page devices-page" aria-label="Devices">
    <div className="dev-list">
      <div className="dev-list-head">
        <h2>Mice</h2>
        <button type="button" className={`icon-btn ${spin ? 'spin' : ''}`} key={spin} disabled={loading} aria-label="Refresh devices"
          title={loading ? 'Refreshing…' : 'Refresh devices'} onClick={() => { setSpin(n => n + 1); void onRefresh(); }}><RefreshCw size={16} /></button>
      </div>
      {error && <div className="dev-list-note"><Callout tone="err">Could not refresh devices: {error}. Previous results are retained.</Callout></div>}
      <div className="dev-items stagger" role="listbox" aria-label="Mice">
        <button type="button" role="option" className="dev-item" aria-selected={selected === DEFAULTS_ID} onClick={() => setSelected(DEFAULTS_ID)}>
          <span className="name">Defaults for new mice</span>
          <span className="meta">Used by mice without their own settings</span>
          <span className="pill muted">Default settings</span>
        </button>
        {entries.map((item, index) => <EntryButton key={item.id} entry={item} index={index + 1} selected={selected === item.id} onSelect={() => setSelected(item.id)} />)}
        {!loading && devices.length === 0 && <div className="empty"><Mouse size={30} aria-hidden="true" /><b>No mouse devices detected</b><span>Connect a mouse and refresh.</span></div>}
      </div>
    </div>
    <div className="dev-detail">
      {selected === DEFAULTS_ID
        ? <DefaultsDetail key="defaults" defaults={editor.deviceDefaults} onChange={editor.updateDeviceDefaults} />
        : entry ? <DeviceDetail key={entry.id} entry={entry} profiles={editor.profiles.map(p => p.name)} tieredProfiles={editor.profiles
            .filter(p => p.accel_x.mode === 'tiered' || p.accel_y.mode === 'tiered').map(p => p.name)} tieredApplyEnabled={tieredApplyEnabled}
            onChange={change => patch(entry.id, change)} />
        : <div className="empty"><b>Select a device to view and edit its configuration.</b></div>}
    </div>
  </section>;
}

function EntryButton({ entry, index, selected, onSelect }: { entry: DeviceEntry; index: number; selected: boolean; onSelect: () => void }) {
  const c = entry.config;
  const pill = c.disable ? <span className="pill warn">Ignored</span>
    : c.profile_id ? <span className="pill">{c.profile_id}</span> : <span className="pill muted">Raw input</span>;
  return <button type="button" role="option" className="dev-item" aria-selected={selected} style={{ '--i': index } as CSSProperties} onClick={onSelect}>
    <span className="name"><span className={`led ${entry.connected ? '' : 'off'}`} aria-hidden="true" />{entry.name}</span>
    <span className="meta">{c.dpi ? `${c.dpi} DPI` : 'Default DPI'} · {c.polling_rate ? `${c.polling_rate} Hz` : 'Default polling rate'}{entry.connected ? '' : ' · disconnected'}</span>
    {pill}
  </button>;
}

function Hardware({ values, onChange }: { values: DeviceDefaults; onChange: (change: Partial<DeviceDefaults>) => void }) {
  return <>
    <div className="panel" style={{ '--i': 2 } as CSSProperties}><h3>Hardware</h3><div className="grid2">
      <Field label="Hardware DPI" hint="0 = default" integer value={values.dpi} min={0} max={32000} step={50} onChange={dpi => onChange({ dpi })} />
      <Field label="Polling rate" unit="Hz" hint="0 = default" integer value={values.polling_rate} min={0} max={8000} step={125} onChange={polling_rate => onChange({ polling_rate })} />
    </div></div>
    <div className="panel" style={{ '--i': 3 } as CSSProperties}><h3>Time clamping</h3><div className="grid2">
      <Field label="Min time clamp" unit="ms" hint="0 = default" value={values.clamp_min} min={0} max={10} step={0.1} onChange={clamp_min => onChange({ clamp_min })} />
      <Field label="Max time clamp" unit="ms" hint="0 = default" value={values.clamp_max} min={0} max={100} step={0.1} onChange={clamp_max => onChange({ clamp_max })} />
    </div>
      <p className="help">Time clamping sets limits on the delta-time between polls. Useful for fixing anomalous polling rate spikes that cause acceleration jumps.</p></div>
    <div className="panel" style={{ '--i': 4 } as CSSProperties}><h3>Behaviour</h3>
      <Check title="Ignore device (disable acceleration)" checked={values.disable} onChange={disable => onChange({ disable })} />
      <Check title="Set extra info (driver flag)" checked={values.set_extra_info} onChange={set_extra_info => onChange({ set_extra_info })} />
      <Check title="Poll time lock" checked={values.poll_time_lock} onChange={poll_time_lock => onChange({ poll_time_lock })} />
    </div>
  </>;
}

function DefaultsDetail({ defaults, onChange }: { defaults: DeviceDefaults; onChange: (change: Partial<DeviceDefaults>) => void }) {
  return <div className="dev-detail-inner stagger">
    <div className="detail-head" style={{ '--i': 0 } as CSSProperties}><h2 className="pane-title">Defaults for new mice</h2>
      <span className="mono sub">Used by any mouse without its own entry</span></div>
    <Hardware values={defaults} onChange={onChange} />
  </div>;
}

function DeviceDetail({ entry, profiles, tieredProfiles, tieredApplyEnabled, onChange }: {
  entry: DeviceEntry; profiles: string[]; tieredProfiles: string[]; tieredApplyEnabled: boolean; onChange: (change: Partial<DeviceConfig>) => void;
}) {
  const current = entry.config.profile_id;
  return <div className="dev-detail-inner stagger">
    <div className="detail-head" style={{ '--i': 0 } as CSSProperties}><h2 className="pane-title">{entry.name}</h2>
      <span className="mono sub">ID: {entry.id}{entry.connected ? '' : ' · disconnected; its saved settings stay in the document'}</span></div>
    <div className="panel" style={{ '--i': 1 } as CSSProperties}><h3>Profile</h3>
      <div className="profile-picks" role="radiogroup" aria-label={`Profile for ${entry.name}`}>
        {[{ value: null as string | null, label: 'Raw input' }, ...profiles.map(name => ({ value: name, label: name }))].map(option =>
          <button type="button" key={option.value ?? ''} className="pick" role="radio" aria-checked={current === option.value}
            onClick={() => { if (current !== option.value) onChange({ profile_id: option.value }); }}>
            <span className="radio" aria-hidden="true" />{option.label}</button>)}
      </div>
      {!tieredApplyEnabled && current && tieredProfiles.includes(current) && <Callout>{current} uses Tiered, which this driver cannot apply yet.</Callout>}
    </div>
    <Hardware values={entry.config} onChange={onChange} />
  </div>;
}
