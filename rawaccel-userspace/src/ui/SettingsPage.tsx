import { type CSSProperties } from 'react';
import { Download, ExternalLink, RefreshCw, Upload } from 'lucide-react';
import { version } from '../../package.json';
import { CustomSelect } from '../components/CustomSelect';
import { driverStatusView, versionText, type DriverStatusSnapshot } from '../driverStatus';
import { PALETTES, type Palette } from '../palettes';
import type { ThemePreference } from '../theme';
import { Segmented, Switch, Tabs } from './controls';
import { StartupPanel } from './StartupPanel';

export type SettingsTab = 'general' | 'themes' | 'startup' | 'driver';

interface SettingsPageProps {
  tab: SettingsTab;
  onTab: (tab: SettingsTab) => void;
  theme: ThemePreference;
  palette: string;
  onMode: (theme: ThemePreference, origin: Element | null) => void;
  onPalette: (id: string, origin: Element | null) => void;
  showToastNotifications: boolean;
  setShowToastNotifications: (value: boolean) => void;
  showConfirmModals: boolean;
  setShowConfirmModals: (value: boolean) => void;
  onImport: () => void;
  onExport: () => void;
  driverStatus: DriverStatusSnapshot;
  onRefreshDriver: () => Promise<void>;
}

const i = (n: number) => ({ '--i': n }) as CSSProperties;

function PaletteCard({ palette, selected, onSelect }: { palette: Palette; selected: boolean; onSelect: (origin: Element) => void }) {
  const half = (mode: 'light' | 'dark') => {
    const c = palette[mode];
    return <span className="pal-half" style={{ background: c.window, borderColor: c.line }}>
      <span className="pal-bar" style={{ background: c.surface, borderColor: c.line }}>
        <i style={{ background: c.accent }} /><b style={{ background: c.line }} /><b style={{ background: c.line }} />
      </span>
      <svg viewBox="0 0 60 26" preserveAspectRatio="none" aria-hidden="true">
        <path d="M0 22 C14 22 18 20 26 14 S44 5 60 4" style={{ stroke: c['c-sens'] }} />
        <path d="M0 24 L60 8" style={{ stroke: c['c-vel'] }} />
        <path d="M0 21 C20 21 28 10 60 9" style={{ stroke: c['c-gain'] }} />
      </svg>
      <span className="pal-btn" style={{ background: c.accent }} />
    </span>;
  };
  return <button type="button" className="pal-card" aria-pressed={selected} onClick={event => onSelect(event.currentTarget)}>
    <span className="pal-preview">{half('light')}{half('dark')}</span>
    <span className="pal-name">{palette.name}{selected && <span className="pill">In use</span>}</span>
    <span className="pal-desc">{palette.description}</span>
  </button>;
}

export function SettingsPage(props: SettingsPageProps) {
  const { tab, onTab } = props;
  const view = driverStatusView(props.driverStatus);
  const report = props.driverStatus.report;
  const diagnostic = report?.diagnostic;
  return <section className="page settings-page" aria-label="Settings">
    <div className="settings-head">
      <Tabs<SettingsTab> label="Settings sections" idBase="settings" value={tab} onChange={onTab}
        tabs={[{ value: 'general', label: 'General' }, { value: 'themes', label: 'Themes' }, { value: 'startup', label: 'Startup & storage' }, { value: 'driver', label: 'Driver & about' }]} />
    </div>
    <div className="settings-body" id="settings-panel" role="tabpanel" aria-labelledby={`settings-tab-${tab}`}>
      <div className={`settings-inner stagger ${tab === 'themes' ? 'one' : ''}`} key={tab}>
        {tab === 'general' && <>
          <div className="panel" style={i(0)}><h3>Appearance</h3>
            <div className="field"><div className="field-top"><span className="label">Mode</span></div>
              <Segmented<ThemePreference> label="Theme" block value={props.theme}
                options={[{ value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }, { value: 'system', label: 'System' }]}
                onChange={value => props.onMode(value, document.activeElement)} /></div>
            <div className="field"><div className="field-top"><span className="label">Language</span></div>
              <CustomSelect label="Language" width="100%" value="en-US" onChange={() => {}}
                options={[{ value: 'en-US', label: 'English (US)' }, { value: 'ja-JP', label: 'Japanese (日本語) — planned', disabled: true }]} /></div>
            <button type="button" className="link-btn start" onClick={() => onTab('themes')}>Choose a colour theme</button>
          </div>
          <div className="panel" style={i(1)}><h3>Notifications</h3>
            <Switch title="Show toast notifications" checked={props.showToastNotifications} onChange={props.setShowToastNotifications}
              description="Informational updates only. Errors and save warnings remain visible." />
            <Switch title="Confirm profile actions" checked={props.showConfirmModals} onChange={props.setShowConfirmModals}
              description="Ask before resetting, reverting, or deleting profiles. Closing or importing over unsaved edits always asks first." />
          </div>
          <div className="panel wide" style={i(2)}><h3>Settings file</h3>
            <div className="btn-row">
              <button type="button" className="btn" title="Import settings JSON" onClick={props.onImport}><Upload size={14} />Import settings</button>
              <button type="button" className="btn" onClick={props.onExport}><Download size={14} />Export settings</button>
            </div>
            <p className="help">Import reads modern and original RawAccel files into the editor. Export saves the editor document without applying it. Nothing reaches the driver until you use Apply &amp; Save.</p>
          </div>
        </>}
        {tab === 'themes' && <div className="panel" style={i(0)}>
          <h3>Colour themes</h3>
          <p className="help">Each theme has a light and a dark version. The Mode setting and the sun/moon button choose between them.</p>
          <div className="pal-grid">
            {PALETTES.map(palette => <PaletteCard key={palette.id} palette={palette} selected={palette.id === props.palette}
              onSelect={origin => { if (palette.id !== props.palette) props.onPalette(palette.id, origin); }} />)}
          </div>
        </div>}
        {tab === 'startup' && <StartupPanel />}
        {tab === 'driver' && <>
          <div className="panel" style={i(0)}>
            <div className="panel-head"><h3>Installed driver</h3>
              <button type="button" className="btn" aria-label="Refresh driver status" disabled={props.driverStatus.checking} onClick={() => void props.onRefreshDriver()}>
                <RefreshCw size={14} className={props.driverStatus.checking ? 'spinning' : undefined} />Check again</button></div>
            <p className="status-line"><span className={`pill tone-${view.tone}`}>{view.label}</span></p>
            <p className="help">{view.description}</p>
            <dl className="kv">
              <dt>Reported version</dt><dd className="mono">{report?.version ? versionText(report.version) : 'Not available'}</dd>
              <dt>Apply target</dt><dd>{report ? `${report.tiered_apply_enabled ? 'Custom Tiered' : 'Stock RawAccel'} ${versionText(report.supported_version)}` : 'Waiting for status'}</dd>
              <dt>Last checked</dt><dd>{props.driverStatus.checkedAt === null ? 'Not yet checked' : new Date(props.driverStatus.checkedAt).toLocaleTimeString()}</dd>
            </dl>
            {!report?.tiered_apply_enabled && <p className="help">Tiered editing, both submodes, and all graph views remain available. Applying Tiered requires a future signed driver that supports it.</p>}
            {(diagnostic || props.driverStatus.ipcError) && <details className="diagnostics">
              <summary>Diagnostic details</summary>
              {diagnostic && <p>Stage: {diagnostic.stage.replace(/_/g, ' ')}
                {diagnostic.win32_code !== null && ` · Windows error ${diagnostic.win32_code}`}
                {diagnostic.hresult && ` · ${diagnostic.hresult}`}</p>}
              <pre className="selectable">{props.driverStatus.ipcError || diagnostic?.message}</pre>
            </details>}
          </div>
          <div className="panel" style={i(1)}><h3>About</h3>
            <p className="help">RawAccel · {version} userspace preview</p>
            <div className="links">
              <a href="https://github.com/RawAccelOfficial/rawaccel" target="_blank" rel="noreferrer">GitHub Repository <ExternalLink size={12} /></a>
              <a href="https://discord.gg/Q3EebmD" target="_blank" rel="noreferrer">Join the Discord <ExternalLink size={12} /></a>
              <a href="https://github.com/RawAccelOfficial/rawaccel/blob/master/doc/Guide.md" target="_blank" rel="noreferrer">User Guide <ExternalLink size={12} /></a>
            </div>
          </div>
        </>}
      </div>
    </div>
  </section>;
}
