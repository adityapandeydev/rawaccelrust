import { useEffect, useState, type CSSProperties } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { FolderOpen, RefreshCw } from 'lucide-react';
import { Callout, Check } from './controls';

interface StartupInfo {
  enabled: boolean | null;
  registration_error: string | null;
  needs_path_update: boolean;
  settings_path: string;
  mirror_path: string | null;
  executable_path: string;
  portable: boolean;
  last_result: { restored: boolean; timestamp_secs: number; settings_path: string; attempts: number; error: string | null } | null;
  diagnostic_error: string | null;
}

export function StartupPanel() {
  const [info, setInfo] = useState<StartupInfo | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    invoke<StartupInfo>('get_startup_info')
      .then(result => { if (active) setInfo(result); })
      .catch(reason => { if (active) setError(String(reason)); })
      .finally(() => { if (active) setBusy(false); });
    return () => { active = false; };
  }, []);

  const update = async (enabled?: boolean) => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      if (enabled !== undefined) await invoke('set_startup_enabled', { enabled });
      const result = await invoke<StartupInfo>('get_startup_info');
      setInfo(result);
      if (enabled !== undefined && result.enabled !== enabled) {
        setError('Windows did not confirm the requested startup state. Check Startup apps in Windows Settings.');
      }
    } catch (reason) {
      setError(String(reason));
    } finally {
      setBusy(false);
    }
  };
  const openFolder = async () => {
    try { await invoke('open_settings_folder'); } catch (reason) { setError(String(reason)); }
  };
  const last = info?.last_result;

  return <>
    <div className="panel" style={{ '--i': 0 } as CSSProperties} aria-busy={busy}>
      <h3>Startup</h3>
      <Check title="Restore settings at sign-in" checked={info?.enabled === true} disabled={busy || info?.enabled == null}
        description="Restores saved settings without opening a window. Use Apply & Save to update what will be restored. Unsaved edits and Tiered previews are not sent to the stock driver."
        onChange={checked => void update(checked)} />
      {(error || info?.registration_error) && <Callout tone="err">{error ?? info?.registration_error}</Callout>}
      <div className="btn-row">
        <button type="button" className="btn" disabled={busy} onClick={() => void update()}><RefreshCw size={14} />{busy ? 'Checking…' : 'Refresh status'}</button>
        {(info?.enabled || info?.needs_path_update) && <button type="button" className="btn" disabled={busy} onClick={() => void update(true)}>Update startup path</button>}
      </div>
      {info && <div className="startup-result" role="status">
        <b>{last ? last.restored ? 'Last startup restoration succeeded' : 'Last startup restoration failed' : 'No startup result recorded'}</b>
        {last && <><span>{new Date(last.timestamp_secs * 1000).toLocaleString()}</span><span className="mono">{last.settings_path}</span>
          {last.error && <span>{last.error}</span>}
          <span className="help">This historical result does not verify the driver’s current settings.</span></>}
        {info.diagnostic_error && <span>{info.diagnostic_error}</span>}
      </div>}
      <p className="help">Disable an existing writer.exe startup shortcut before enabling this option, so two startup entries do not overwrite each other’s settings. For development builds, startup points to the development executable; configure it again from your final installation.</p>
    </div>
    {info && <div className="panel" style={{ '--i': 1 } as CSSProperties}>
      <h3>Storage</h3>
      <dl className="kv">
        <dt>Storage mode</dt><dd>{info.portable ? 'Portable · portable.txt present' : 'Installed · Local AppData'}</dd>
        <dt>Authoritative settings</dt><dd><div className="path">{info.settings_path}</div></dd>
        <dt>Recovery mirror</dt><dd><div className="path">{info.mirror_path ?? 'Not available'}</div></dd>
        <dt>This executable</dt><dd><div className="path">{info.executable_path}</div></dd>
      </dl>
      <div className="btn-row"><button type="button" className="btn" onClick={() => void openFolder()}><FolderOpen size={14} />Open settings folder</button></div>
      <p className="help">Custom install folders are supported. After moving a portable copy, update its startup path here. Add portable.txt beside the executable to use adjacent settings; restart RawAccel after changing storage mode.</p>
    </div>}
  </>;
}
