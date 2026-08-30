import React, { useState } from "react";
import { Device, Profile } from "../types";
import { Layers, Monitor, Activity, Plus, Trash2 } from "lucide-react";

// Mock data
const MOCK_DEVICES: Device[] = [
  {
    id: "VID_046D&PID_C08B",
    name: "Logitech G502 HERO Gaming Mouse",
    profile_id: "Valorant Low Sens",
    config: { disable: false, set_extra_info: false, poll_time_lock: false, dpi: 800, polling_rate: 1000, clamp_min: 0, clamp_max: 0 }
  },
  {
    id: "VID_1532&PID_008A",
    name: "Razer DeathAdder V2",
    profile_id: null,
    config: { disable: false, set_extra_info: true, poll_time_lock: false, dpi: 1600, polling_rate: 1000, clamp_min: 0, clamp_max: 0 }
  }
];

const MOCK_PROFILES = [
  "Default Profile",
  "Valorant Low Sens",
  "Apex Tracking"
];

export function MappingsView() {
  const [devices, setDevices] = useState<Device[]>(MOCK_DEVICES);

  const assignProfile = (deviceId: string, profileName: string | null) => {
    setDevices(devices.map(d => {
      if (d.id === deviceId) {
        return { ...d, profile_id: profileName };
      }
      return d;
    }));
  };

  return (
    <div style={{ padding: "1.5rem", height: "100%", width: "100%", overflowY: "auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
        <div>
          <h2 style={{ fontSize: "1.25rem", margin: 0, display: "flex", alignItems: "center", gap: "0.5rem" }}><Layers size={20} color="var(--color-primary)" /> Device Mappings</h2>
          <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginTop: "0.25rem" }}>Bind specific acceleration profiles to individual hardware devices.</p>
        </div>
        <button className="btn btn-primary"><Plus size={16} /> Add Mapping</button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        {devices.map(device => (
          <div key={device.id} className="panel" style={{ display: "flex", alignItems: "center", gap: "2rem", padding: "1.5rem" }}>
            
            <div style={{ flex: 1, display: "flex", alignItems: "flex-start", gap: "1rem" }}>
              <div style={{ padding: "0.75rem", backgroundColor: "var(--bg-app)", borderRadius: "var(--radius-md)", color: "var(--text-muted)" }}>
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
                  value={device.profile_id || ""}
                  onChange={(e) => assignProfile(device.id, e.target.value === "" ? null : e.target.value)}
                >
                  <option value="">-- No Profile (Raw Input) --</option>
                  {MOCK_PROFILES.map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
            </div>

          </div>
        ))}
      </div>
    </div>
  );
}
