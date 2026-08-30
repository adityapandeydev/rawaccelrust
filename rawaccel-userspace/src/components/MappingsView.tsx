import { Device, DeviceConfig } from "../types";
import { Layers, Monitor, Activity, Plus } from "lucide-react";

export function MappingsView({ 
  devices, 
  deviceConfig, 
  setDeviceConfig,
  profiles 
}: { 
  devices: Device[], 
  deviceConfig: DeviceConfig[], 
  setDeviceConfig: (cfg: DeviceConfig[]) => void,
  profiles: string[]
}) {
  const assignProfile = (deviceId: string, profileName: string | null) => {
    let newConfig = [...deviceConfig];
    const existingIdx = newConfig.findIndex(c => c.id === deviceId);
    if (existingIdx >= 0) {
      newConfig[existingIdx].profile_id = profileName;
    } else {
      newConfig.push({ 
        id: deviceId, 
        profile_id: profileName,
        disable: false,
        set_extra_info: false,
        poll_time_lock: false,
        dpi: 0,
        polling_rate: 0,
        clamp_min: 0,
        clamp_max: 0
      });
    }
    setDeviceConfig(newConfig);
  };

  return (
    <div style={{ padding: "1.5rem", height: "100%", width: "100%", overflowY: "auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
        <div>
          <h2 style={{ fontSize: "1.25rem", margin: 0, display: "flex", alignItems: "center", gap: "0.5rem" }}><Layers size={20} color="var(--color-primary)" /> Device Mappings</h2>
          <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginTop: "0.25rem" }}>Enable and bind specific acceleration profiles to individual hardware devices.</p>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        {devices.map(device => {
          const config = deviceConfig.find(c => c.id === device.id);
          const isMapped = !!config?.profile_id;
          
          return (
            <div key={device.id} className="panel" style={{ display: "flex", alignItems: "center", gap: "2rem", padding: "1.5rem", borderLeft: isMapped ? "4px solid var(--color-primary)" : "4px solid transparent" }}>
              
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <input 
                  type="checkbox" 
                  checked={isMapped}
                  onChange={(e) => {
                    if (e.target.checked && profiles.length > 0) {
                      assignProfile(device.id, profiles[0]);
                    } else {
                      assignProfile(device.id, null);
                    }
                  }}
                  style={{ width: "1.2rem", height: "1.2rem", accentColor: "var(--color-primary)", cursor: "pointer" }}
                  title="Enable mapping for this device"
                />
              </div>

              <div style={{ flex: 1, display: "flex", alignItems: "flex-start", gap: "1rem" }}>
                <div style={{ padding: "0.75rem", backgroundColor: "var(--bg-app)", borderRadius: "var(--radius-md)", color: isMapped ? "var(--color-primary)" : "var(--text-muted)" }}>
                  <Monitor size={24} />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                  <h3 style={{ fontSize: "1rem", margin: 0 }}>{device.name}</h3>
                  <span className="mono" style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{device.id}</span>
                </div>
              </div>

              <div style={{ fontSize: "1.5rem", color: "var(--border)" }}>→</div>

              <div style={{ flex: 1 }}>
                <div className="input-group" style={{ margin: 0 }}>
                  <label className="input-label" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <Activity size={14} /> Assigned Profile
                  </label>
                  <select 
                    className="input-field" 
                    style={{ width: "100%", padding: "0.5rem" }}
                    value={config?.profile_id || ""}
                    onChange={(e) => assignProfile(device.id, e.target.value === "" ? null : e.target.value)}
                  >
                    <option value="">-- No Profile (Raw Input) --</option>
                    {profiles.map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
              </div>

            </div>
          );
        })}
      </div>
    </div>
  );
}
