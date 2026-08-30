import { NumberInput } from "./NumberInput";
import { useState } from "react";
import { Device, DeviceConfig } from "../types";
import { Monitor } from "lucide-react";

export function DevicesView({ 
  devices,
  deviceConfig,
  setDeviceConfig
}: { 
  devices: Device[],
  deviceConfig: DeviceConfig[],
  setDeviceConfig: (cfg: DeviceConfig[]) => void
}) {
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(devices[0]?.id || null);

  const selectedDevice = devices.find(d => d.id === selectedDeviceId);
  const selectedConfig = deviceConfig.find(c => c.id === selectedDeviceId);

  const updateConfig = (key: keyof DeviceConfig, value: any) => {
    if (!selectedDeviceId) return;
    
    let newConfig = [...deviceConfig];
    const existingIdx = newConfig.findIndex(c => c.id === selectedDeviceId);
    
    if (existingIdx >= 0) {
      newConfig[existingIdx] = { ...newConfig[existingIdx], [key]: value };
    } else {
      // If no config exists, we can't fully update it since we don't have defaults here easily,
      // but App.tsx ensures the default is pushed if there are devices.
      // For safety, push a minimal config
      newConfig.push({
        id: selectedDeviceId,
        profile_id: null,
        disable: false,
        set_extra_info: false,
        poll_time_lock: false,
        dpi: 0,
        polling_rate: 0,
        clamp_min: 0,
        clamp_max: 0,
        [key]: value
      });
    }
    setDeviceConfig(newConfig);
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: "1.5rem", padding: "1.5rem", height: "100%", width: "100%", overflow: "hidden" }}>
      
      {/* Device List */}
      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        <div className="panel" style={{ flex: 1, display: "flex", flexDirection: "column", padding: "1.5rem 0 0 0", overflow: "hidden" }}>
          <div style={{ padding: "0 1.5rem" }}>
            <div className="panel-header" style={{ marginBottom: "0.5rem" }}>
              System Devices
            </div>
          </div>
          
          <div style={{ flex: 1, padding: "0.5rem", overflowY: "auto" }}>
            <ul className="sidebar-list">
              {devices.map(d => (
                <li 
                  key={d.id} 
                  className={`sidebar-list-item ${selectedDeviceId === d.id ? "active" : ""}`}
                  onClick={() => setSelectedDeviceId(d.id)}
                  style={{ padding: "0.75rem", display: "flex", alignItems: "center", gap: "0.75rem" }}
                >
                  <Monitor size={16} />
                  <div style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
                    <span style={{ fontSize: "0.85rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{d.name}</span>
                    <span style={{ fontSize: "0.65rem", color: selectedDeviceId === d.id ? "var(--bg-app)" : "var(--text-muted)", fontFamily: "var(--font-mono)" }}>{d.id}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Device Settings */}
      {selectedDevice && selectedConfig ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", overflowY: "auto", paddingRight: "1rem" }}>
          <div className="panel">
            <div className="panel-header" style={{ marginBottom: "0.5rem" }}>
              {selectedDevice.name}
            </div>
            <p className="mono" style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "1.5rem" }}>ID: {selectedDevice.id}</p>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem" }}>
              
              {/* Left Settings */}
              <div>
                <div className="input-group">
                  <label className="input-label">Hardware DPI</label>
                  <NumberInput className="input-field selectable" value={selectedConfig.dpi || 0} onChange={e => updateConfig("dpi", parseInt(e.target.value) || 0)} />
                </div>
                <div className="input-group">
                  <label className="input-label">Polling Rate (Hz)</label>
                  <NumberInput className="input-field selectable" value={selectedConfig.polling_rate || 0} onChange={e => updateConfig("polling_rate", parseInt(e.target.value) || 0)} />
                </div>
                
                <div style={{ marginTop: "2rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: "0.75rem", cursor: "pointer", fontSize: "0.9rem" }}>
                    <input type="checkbox" checked={selectedConfig.disable} onChange={e => updateConfig("disable", e.target.checked)} style={{ accentColor: "var(--color-primary)", width: "16px", height: "16px" }} />
                    Ignore Device (Disable Accel)
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: "0.75rem", cursor: "pointer", fontSize: "0.9rem" }}>
                    <input type="checkbox" checked={selectedConfig.set_extra_info} onChange={e => updateConfig("set_extra_info", e.target.checked)} style={{ accentColor: "var(--color-primary)", width: "16px", height: "16px" }} />
                    Set Extra Info (Driver flag)
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: "0.75rem", cursor: "pointer", fontSize: "0.9rem" }}>
                    <input type="checkbox" checked={selectedConfig.poll_time_lock} onChange={e => updateConfig("poll_time_lock", e.target.checked)} style={{ accentColor: "var(--color-primary)", width: "16px", height: "16px" }} />
                    Poll Time Lock
                  </label>
                </div>
              </div>

              {/* Right Settings */}
              <div>
                <h4 style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "1rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Time Clamping</h4>
                <div className="input-group">
                  <label className="input-label">Min Time Clamp</label>
                  <NumberInput className="input-field selectable" value={selectedConfig.clamp_min || 0} onChange={e => updateConfig("clamp_min", parseFloat(e.target.value) || 0)} step="0.1" />
                </div>
                <div className="input-group">
                  <label className="input-label">Max Time Clamp</label>
                  <NumberInput className="input-field selectable" value={selectedConfig.clamp_max || 0} onChange={e => updateConfig("clamp_max", parseFloat(e.target.value) || 0)} step="0.1" />
                </div>
                <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "1rem", lineHeight: 1.5 }}>
                  Time clamping sets limits on the delta-time between polls. Useful for fixing anomalous polling rate spikes that cause acceleration jumps.
                </p>
              </div>

            </div>
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", height: "100%" }}>
          Select a device to view and edit its configuration.
        </div>
      )}
    </div>
  );
}

