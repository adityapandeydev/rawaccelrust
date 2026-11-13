import { useState, type CSSProperties } from 'react';
import { Maximize2, Minimize2, Mouse } from 'lucide-react';
import type { Device } from '../types';
import type { ProfileEditor } from '../hooks/useProfileEditor';
import type { Notify } from '../hooks/useNotifications';
import { CurveCanvas, type VisibleGraphs } from './CurveCanvas';
import { Inspector } from './Inspector';
import { Segmented } from './controls';

const GRAPHS: { kind: keyof VisibleGraphs; label: string; color: string }[] = [
  { kind: 'sensitivity', label: 'Sensitivity', color: 'var(--c-sens)' },
  { kind: 'velocity', label: 'Velocity', color: 'var(--c-vel)' },
  { kind: 'gain', label: 'Gain', color: 'var(--c-gain)' },
];

export function CurvePage({ editor, notify, devices, devicesLoading, tieredApplyEnabled, live, appearance, onAssign }: {
  editor: ProfileEditor; notify: Notify; devices: Device[]; devicesLoading: boolean; tieredApplyEnabled: boolean;
  live: boolean; appearance: string; onAssign: () => void;
}) {
  const [visible, setVisible] = useState<VisibleGraphs>({ sensitivity: true, velocity: false, gain: false });
  const [expanded, setExpanded] = useState(false);
  const [refused, setRefused] = useState<string | null>(null);
  const { activeProfile, linkXY } = editor;
  const assigned = editor.deviceConfig.filter(device => !device.disable && device.profile_id === activeProfile.name);

  const toggle = (kind: keyof VisibleGraphs) => {
    // At least one graph stays visible.
    if (visible[kind] && Object.values(visible).filter(Boolean).length === 1) {
      setRefused(kind);
      setTimeout(() => setRefused(null), 260);
      return;
    }
    setVisible(current => ({ ...current, [kind]: !current[kind] }));
  };

  return <section className="page curve-page" aria-label="Curve">
    <div className="graph-col">
      <div className="graph-toolbar">
        <div className="toggles" role="group" aria-label="Visible graphs">
          {GRAPHS.map(g => <button key={g.kind} type="button" className={`gtoggle ${refused === g.kind ? 'nudge' : ''}`}
            aria-pressed={visible[g.kind]} style={{ '--c': g.color } as CSSProperties} onClick={() => toggle(g.kind)}>
            <span className="sw" aria-hidden="true" />{g.label}</button>)}
        </div>
        <span className="grow" />
        <span className="tlabel">Axes</span>
        <Segmented<'combined' | 'component'> label="Input processing" value={linkXY ? 'combined' : 'component'}
          options={[{ value: 'combined', label: 'Combined' }, { value: 'component', label: 'By component' }]}
          onChange={value => { if (value === 'combined') editor.handleLinkXY(); else editor.handleSelectXAxis(); }} />
        <Segmented<'x' | 'y'> label="Curve editing axes" className="axis-seg" disabled={linkXY} value={editor.activeCurveAxis}
          options={[{ value: 'x', label: 'Edit X' }, { value: 'y', label: 'Edit Y' }]}
          onChange={value => { if (value === 'x') editor.handleSelectXAxis(); else editor.handleSelectYAxis(); }} />

      </div>
      <CurveCanvas argsX={activeProfile.accel_x} argsY={activeProfile.accel_y} whole={linkXY} editAxis={editor.activeCurveAxis}
        visible={visible} expanded={expanded} live={live} appearance={appearance} identity={activeProfile.id}
        onLookupChange={(axis, table) => editor.updateActiveProfile(profile => linkXY
          ? { ...profile, accel_x: { ...profile.accel_x, lookup_table: table.map(p => ({ ...p })) }, accel_y: { ...profile.accel_y, lookup_table: table.map(p => ({ ...p })) } }
          : { ...profile, [axis === 'x' ? 'accel_x' : 'accel_y']: { ...profile[axis === 'x' ? 'accel_x' : 'accel_y'], lookup_table: table } })}>
        <button type="button" className="icon-btn graph-expand" aria-pressed={expanded} onClick={() => setExpanded(value => !value)}
          title={expanded ? 'Show speeds up to 80 counts/ms' : 'Show speeds up to 200 counts/ms'} aria-label={expanded ? 'Minimize graph domain' : 'Expand graph domain'}>
          {expanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}</button>
      </CurveCanvas>
      <div className="graph-foot">
        <span className="tlabel">Used by</span>
        {assigned.length ? assigned.map(device => <span className="dev-chip" key={device.id}><Mouse size={13} aria-hidden="true" />
          <b>{devices.find(item => item.id === device.id)?.name ?? (devicesLoading ? 'Discovering devices…' : 'Disconnected device')}</b>
          <span className="mono">{device.dpi ? `${device.dpi} DPI` : 'Default DPI'} · {device.polling_rate ? `${device.polling_rate} Hz` : 'Default polling rate'}</span></span>)
          : <span className="dev-chip">No devices assigned</span>}
        <button type="button" className="link-btn" onClick={onAssign}>Assign mice</button>
      </div>
    </div>
    <Inspector editor={editor} notify={notify} tieredApplyEnabled={tieredApplyEnabled} />
  </section>;
}
