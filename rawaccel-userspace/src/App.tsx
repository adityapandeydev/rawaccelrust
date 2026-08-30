import { useState, useEffect } from "react";
import { Moon, Sun, Monitor, Layers, Activity, Plus, Save, Download, Upload, Mouse, Menu, X } from "lucide-react";
import "./index.css";
import { Profile, defaultProfile, AccelArgs } from "./types";
import { CurveGraph } from "./components/CurveGraph";
import { CustomSelect } from "./components/CustomSelect";
import { DevicesView } from "./components/DevicesView";
import { MappingsView } from "./components/MappingsView";

function App() {
  const [profile, setProfile] = useState<Profile>(defaultProfile());
  const [activeTab, setActiveTab] = useState<"devices" | "mappings" | "profiles">("profiles");
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [activeCurveAxis, setActiveCurveAxis] = useState<"x" | "y">("x");
  const [linkXY, setLinkXY] = useState(true);
  const [lookupType, setLookupType] = useState<"sensitivity" | "velocity">("sensitivity");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showExtras, setShowExtras] = useState(false);
  
  useEffect(() => {
    if (theme === "light") {
      document.body.setAttribute("data-theme", "light");
    } else {
      document.body.removeAttribute("data-theme");
    }
  }, [theme]);

  async function applySettings() {
    try {
      console.log("Settings applied!", profile);
    } catch (error) {
      console.error(error);
    }
  }

  // State Update Helpers
  const updateProfile = (key: keyof Profile, value: any) => {
    setProfile(p => ({ ...p, [key]: value }));
  };

  const updateSpeed = (key: string, value: number) => {
    setProfile(p => ({ ...p, speed_processor_args: { ...p.speed_processor_args, [key]: value } }));
  };

  const updateAccel = (key: keyof AccelArgs, value: any) => {
    setProfile(p => {
      const next = { ...p };
      if (linkXY) {
        next.accel_x = { ...next.accel_x, [key]: value };
        next.accel_y = { ...next.accel_y, [key]: value };
      } else {
        if (activeCurveAxis === "x") next.accel_x = { ...next.accel_x, [key]: value };
        if (activeCurveAxis === "y") next.accel_y = { ...next.accel_y, [key]: value };
      }
      return next;
    });
  };

  const activeAccel = activeCurveAxis === "x" ? profile.accel_x : profile.accel_y;

  const navigateTo = (tab: typeof activeTab) => {
    setActiveTab(tab);
    setIsSidebarOpen(false);
  };

  return (
    <div className="app-container">
      
      {/* ── OVERLAY SIDEBAR DRAWER ── */}
      {isSidebarOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 40 }} onClick={() => setIsSidebarOpen(false)}>
          {/* Overlay Background */}
          <div style={{ position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.4)", backdropFilter: "blur(2px)" }} />
        </div>
      )}
      
      <aside className={`sidebar-drawer ${isSidebarOpen ? "open" : ""}`}>
        <div style={{ padding: "0.5rem 0", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <Mouse size={24} color="var(--color-primary)" />
            <h2 style={{ fontSize: "1.2rem", margin: 0, fontWeight: 700, color: "var(--text-main)", marginRight: "0.5rem" }}>Raw Accel</h2>
            
            <button 
              className="btn" 
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")} 
              style={{ padding: "0.25rem", background: "var(--bg-input)", border: "1px solid var(--border)", color: "var(--text-muted)", cursor: "pointer", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}
              title="Toggle Theme"
            >
              {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
            </button>
          </div>
          <button className="btn" style={{ padding: "0.25rem", background: "transparent", border: "none", color: "var(--text-muted)" }} onClick={() => setIsSidebarOpen(false)}>
            <X size={20} />
          </button>
        </div>
        
        <nav style={{ display: "flex", flexDirection: "column", flex: 1 }}>
          <span className="input-label" style={{ marginBottom: "0.5rem", paddingLeft: "0.5rem" }}>Navigation</span>
          <div className={`nav-link ${activeTab === "profiles" ? "active" : ""}`} onClick={() => navigateTo("profiles")}>
            <Activity size={16} style={{ marginRight: "0.75rem" }}/> Profiles
          </div>
          <div className={`nav-link ${activeTab === "devices" ? "active" : ""}`} onClick={() => navigateTo("devices")}>
            <Monitor size={16} style={{ marginRight: "0.75rem" }}/> Devices
          </div>
          <div className={`nav-link ${activeTab === "mappings" ? "active" : ""}`} onClick={() => navigateTo("mappings")}>
            <Layers size={16} style={{ marginRight: "0.75rem" }}/> Mappings
          </div>
        </nav>
        
        <div style={{ paddingTop: "1.25rem", borderTop: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button className="btn" style={{ flex: 1 }}><Upload size={14} /> Load</button>
            <button className="btn" style={{ flex: 1 }}><Download size={14} /> Save</button>
          </div>
        </div>
      </aside>

      {/* ── MAIN CONTENT ── */}
      <main className="main-content" style={{ display: "flex", flexDirection: "column", width: "100%" }}>
        
        {/* Global Header */}
        <header style={{ padding: "1rem 1.5rem", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center", backgroundColor: "var(--bg-app)", zIndex: 5 }}>
          
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <button className="btn" style={{ padding: "0.5rem", background: "transparent", border: "none", color: "var(--text-main)", cursor: "pointer", display: "flex", alignItems: "center" }} onClick={() => setIsSidebarOpen(true)}>
              <Menu size={22} />
            </button>
            
            <h1 style={{ fontSize: "1.25rem", margin: 0, color: "var(--text-main)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              {profile.name}
              {activeTab === "profiles" && (
                <button className="btn" style={{ padding: "0.2rem", background: "transparent", border: "none", color: "var(--color-primary)", cursor: "pointer" }} title="Add New Profile">
                  <Plus size={18} />
                </button>
              )}
            </h1>
            {activeTab === "profiles" && <span style={{ padding: "0.25rem 0.6rem", backgroundColor: "var(--color-primary-bg)", color: "var(--color-primary)", borderRadius: "var(--radius-sm)", fontSize: "0.75rem", fontWeight: 600 }}>Active</span>}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
            {activeTab === "profiles" && (
              <>
                <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", fontSize: "0.85rem", color: "var(--text-muted)", margin: 0 }}>
                  <input 
                    type="checkbox" 
                    checked={showExtras} 
                    onChange={(e) => setShowExtras(e.target.checked)}
                    style={{ accentColor: "var(--color-primary)", margin: 0, cursor: "pointer" }}
                  />
                  Show Velocity & Gain
                </label>

                <div style={{ display: "flex", gap: "0.25rem", background: "var(--bg-input)", padding: "0.25rem", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)" }}>
                  <button className="btn" style={{ padding: "0.25rem 0.75rem", fontSize: "0.75rem", background: linkXY ? "var(--color-primary)" : "transparent", color: linkXY ? "#fff" : "var(--text-muted)", border: "none" }} onClick={() => setLinkXY(true)}>Link X/Y</button>
                  <button className="btn" style={{ padding: "0.25rem 0.75rem", fontSize: "0.75rem", background: !linkXY && activeCurveAxis === "x" ? "var(--color-primary)" : "transparent", color: !linkXY && activeCurveAxis === "x" ? "#fff" : "var(--text-muted)", border: "none" }} onClick={() => { setLinkXY(false); setActiveCurveAxis("x"); }}>X Axis</button>
                  <button className="btn" style={{ padding: "0.25rem 0.75rem", fontSize: "0.75rem", background: !linkXY && activeCurveAxis === "y" ? "var(--color-primary)" : "transparent", color: !linkXY && activeCurveAxis === "y" ? "#fff" : "var(--text-muted)", border: "none" }} onClick={() => { setLinkXY(false); setActiveCurveAxis("y"); }}>Y Axis</button>
                </div>
              </>
            )}

            <button className="btn btn-primary" onClick={applySettings}><Save size={16} /> Apply to Mouse</button>
          </div>
        </header>

        {activeTab === "profiles" && (
          <div style={{ display: "grid", gridTemplateColumns: "340px 1fr", padding: "0 1.5rem 1.5rem 1.5rem", gap: "1.5rem", height: "calc(100vh - 65px)", overflow: "hidden" }}>
            
            {/* Left Column: Mode Selection, Fields & Advanced Config */}
            <div className="custom-scrollbar" style={{ display: "flex", flexDirection: "column", gap: "1.5rem", height: "100%", overflowY: "auto", paddingRight: "0.5rem", paddingTop: "1.5rem" }}>
              
              {/* Mode Settings Pane */}
              <div className="panel" style={{ padding: "1.5rem" }}>
                <div className="panel-header" style={{ marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "1rem" }}>
                  <div style={{ flex: 1 }}>
                    <CustomSelect
                      width="100%"
                      value={activeAccel.mode}
                      onChange={(val) => updateAccel("mode", val)}
                      options={[
                        { value: "linear", label: "Linear" },
                        { value: "classic", label: "Classic" },
                        { value: "jump", label: "Jump" },
                        { value: "natural", label: "Natural" },
                        { value: "power", label: "Power" },
                        { value: "synchronous", label: "Synchronous" },
                        { value: "tiered", label: "Tiered" },
                        { value: "lookup", label: "Lookup Table" },
                        { value: "noaccel", label: "Off" },
                      ]}
                    />
                  </div>

                  {/* Shared Gain Checkbox - Beside Mode Selector */}
                  {activeAccel.mode !== "noaccel" && activeAccel.mode !== "lookup" && (
                    <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", whiteSpace: "nowrap" }}>
                      <input type="checkbox" checked={activeAccel.gain} onChange={e => updateAccel("gain", e.target.checked)} style={{ accentColor: "var(--color-primary)", width: "16px", height: "16px", margin: 0 }} />
                      <span style={{ fontSize: "0.85rem", fontWeight: 500, color: "var(--text-main)" }}>Gain</span>
                    </label>
                  )}
                </div>
                
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>

                  {/* ───────────────────────────────────────────────────────── */}
                  {/* LINEAR MODE                                                 */}
                  {/* ───────────────────────────────────────────────────────── */}
                  {activeAccel.mode === "linear" && (
                    <>
                      {activeAccel.cap_mode !== "io" && (
                        <div className="input-group">
                          <label className="input-label">Acceleration</label>
                          <input type="number" className="input-field selectable" value={activeAccel.acceleration} onChange={e => updateAccel("acceleration", parseFloat(e.target.value))} step="0.001" />
                        </div>
                      )}
                      
                      <div className="input-group">
                        <label className="input-label">Cap Type</label>
                        <CustomSelect
                          width="120px"
                          value={activeAccel.cap_mode === "io" ? "both" : activeAccel.cap_mode}
                          onChange={(val) => updateAccel("cap_mode", val === "both" ? "io" : val)}
                          options={[
                            { value: "out", label: "Output" },
                            { value: "in", label: "Input" },
                            { value: "both", label: "Both" }
                          ]}
                        />
                      </div>

                      {activeAccel.cap_mode === "in" || activeAccel.cap_mode === "out" ? (
                        <div className="input-group">
                          <label className="input-label">Cap: {activeAccel.cap_mode === "in" ? "Input" : "Output"}</label>
                          <input type="number" className="input-field selectable" value={activeAccel.cap.x} onChange={e => updateAccel("cap", { ...activeAccel.cap, x: parseFloat(e.target.value) })} step="0.1" />
                        </div>
                      ) : (
                        <>
                          <div className="input-group">
                            <label className="input-label">Cap: Input</label>
                            <input type="number" className="input-field selectable" value={activeAccel.cap.x} onChange={e => updateAccel("cap", { ...activeAccel.cap, x: parseFloat(e.target.value) })} step="0.1" />
                          </div>
                          <div className="input-group">
                            <label className="input-label">Cap: Output</label>
                            <input type="number" className="input-field selectable" value={activeAccel.cap.y} onChange={e => updateAccel("cap", { ...activeAccel.cap, y: parseFloat(e.target.value) })} step="0.1" />
                          </div>
                        </>
                      )}

                      <div className="input-group">
                        <label className="input-label">Input Offset</label>
                        <input type="number" className="input-field selectable" value={activeAccel.input_offset} onChange={e => updateAccel("input_offset", parseFloat(e.target.value))} step="0.1" />
                      </div>
                    </>
                  )}

                  {/* ───────────────────────────────────────────────────────── */}
                  {/* CLASSIC MODE                                                */}
                  {/* ───────────────────────────────────────────────────────── */}
                  {activeAccel.mode === "classic" && (
                    <>
                      <div className="input-group">
                        <label className="input-label">Cap Type</label>
                        <CustomSelect
                          width="120px"
                          value={activeAccel.cap_mode === "io" ? "both" : activeAccel.cap_mode}
                          onChange={(val) => updateAccel("cap_mode", val === "both" ? "io" : val)}
                          options={[
                            { value: "out", label: "Output" },
                            { value: "in", label: "Input" },
                            { value: "both", label: "Both" }
                          ]}
                        />
                      </div>

                      {activeAccel.cap_mode === "in" || activeAccel.cap_mode === "out" ? (
                        <>
                          <div className="input-group">
                            <label className="input-label">Cap: {activeAccel.cap_mode === "in" ? "Input" : "Output"}</label>
                            <input type="number" className="input-field selectable" value={activeAccel.cap.x} onChange={e => updateAccel("cap", { ...activeAccel.cap, x: parseFloat(e.target.value) })} step="0.1" />
                          </div>
                          <div className="input-group">
                            <label className="input-label">Acceleration</label>
                            <input type="number" className="input-field selectable" value={activeAccel.acceleration} onChange={e => updateAccel("acceleration", parseFloat(e.target.value))} step="0.001" />
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="input-group">
                            <label className="input-label">Cap: Input</label>
                            <input type="number" className="input-field selectable" value={activeAccel.cap.x} onChange={e => updateAccel("cap", { ...activeAccel.cap, x: parseFloat(e.target.value) })} step="0.1" />
                          </div>
                          <div className="input-group">
                            <label className="input-label">Cap: Output</label>
                            <input type="number" className="input-field selectable" value={activeAccel.cap.y} onChange={e => updateAccel("cap", { ...activeAccel.cap, y: parseFloat(e.target.value) })} step="0.1" />
                          </div>
                        </>
                      )}

                      <div className="input-group">
                        <label className="input-label">Input Offset</label>
                        <input type="number" className="input-field selectable" value={activeAccel.input_offset} onChange={e => updateAccel("input_offset", parseFloat(e.target.value))} step="0.1" />
                      </div>
                      
                      <div className="input-group">
                        <label className="input-label">Power</label>
                        <input type="number" className="input-field selectable" value={activeAccel.exponent_classic} onChange={e => updateAccel("exponent_classic", parseFloat(e.target.value))} step="0.1" />
                      </div>
                    </>
                  )}

                  {/* ───────────────────────────────────────────────────────── */}
                  {/* JUMP MODE                                                   */}
                  {/* ───────────────────────────────────────────────────────── */}
                  {activeAccel.mode === "jump" && (
                    <>
                      <div className="input-group">
                        <label className="input-label">Smooth</label>
                        <input type="number" className="input-field selectable" value={activeAccel.smooth} onChange={e => updateAccel("smooth", parseFloat(e.target.value))} step="0.1" />
                      </div>
                      <div className="input-group">
                        <label className="input-label">Input</label>
                        <input type="number" className="input-field selectable" value={activeAccel.cap.x} onChange={e => updateAccel("cap", { ...activeAccel.cap, x: parseFloat(e.target.value) })} step="0.1" />
                      </div>
                      <div className="input-group">
                        <label className="input-label">Output</label>
                        <input type="number" className="input-field selectable" value={activeAccel.cap.y} onChange={e => updateAccel("cap", { ...activeAccel.cap, y: parseFloat(e.target.value) })} step="0.1" />
                      </div>
                    </>
                  )}

                  {/* ───────────────────────────────────────────────────────── */}
                  {/* NATURAL MODE                                                */}
                  {/* ───────────────────────────────────────────────────────── */}
                  {activeAccel.mode === "natural" && (
                    <>
                      <div className="input-group">
                        <label className="input-label">Decay Rate</label>
                        <input type="number" className="input-field selectable" value={activeAccel.decay_rate} onChange={e => updateAccel("decay_rate", parseFloat(e.target.value))} step="0.01" />
                      </div>
                      <div className="input-group">
                        <label className="input-label">Input Offset</label>
                        <input type="number" className="input-field selectable" value={activeAccel.input_offset} onChange={e => updateAccel("input_offset", parseFloat(e.target.value))} step="0.1" />
                      </div>
                      <div className="input-group">
                        <label className="input-label">Limit</label>
                        <input type="number" className="input-field selectable" value={activeAccel.limit} onChange={e => updateAccel("limit", parseFloat(e.target.value))} step="0.1" />
                      </div>
                    </>
                  )}

                  {/* ───────────────────────────────────────────────────────── */}
                  {/* POWER MODE                                                  */}
                  {/* ───────────────────────────────────────────────────────── */}
                  {activeAccel.mode === "power" && (
                    <>
                      {activeAccel.cap_mode !== "io" && (
                        <div className="input-group">
                          <label className="input-label">Scale</label>
                          <input type="number" className="input-field selectable" value={activeAccel.scale} onChange={e => updateAccel("scale", parseFloat(e.target.value))} step="0.1" />
                        </div>
                      )}

                      <div className="input-group">
                        <label className="input-label">Cap Type</label>
                        <CustomSelect
                          width="120px"
                          value={activeAccel.cap_mode === "io" ? "both" : activeAccel.cap_mode}
                          onChange={(val) => updateAccel("cap_mode", val === "both" ? "io" : val)}
                          options={[
                            { value: "out", label: "Output" },
                            { value: "in", label: "Input" },
                            { value: "both", label: "Both" }
                          ]}
                        />
                      </div>

                      {activeAccel.cap_mode === "in" || activeAccel.cap_mode === "out" ? (
                        <div className="input-group">
                          <label className="input-label">Cap: {activeAccel.cap_mode === "in" ? "Input" : "Output"}</label>
                          <input type="number" className="input-field selectable" value={activeAccel.cap.x} onChange={e => updateAccel("cap", { ...activeAccel.cap, x: parseFloat(e.target.value) })} step="0.1" />
                        </div>
                      ) : (
                        <>
                          <div className="input-group">
                            <label className="input-label">Cap: Input</label>
                            <input type="number" className="input-field selectable" value={activeAccel.cap.x} onChange={e => updateAccel("cap", { ...activeAccel.cap, x: parseFloat(e.target.value) })} step="0.1" />
                          </div>
                          <div className="input-group">
                            <label className="input-label">Cap: Output</label>
                            <input type="number" className="input-field selectable" value={activeAccel.cap.y} onChange={e => updateAccel("cap", { ...activeAccel.cap, y: parseFloat(e.target.value) })} step="0.1" />
                          </div>
                        </>
                      )}

                      <div className="input-group">
                        <label className="input-label">Exponent</label>
                        <input type="number" className="input-field selectable" value={activeAccel.exponent_power} onChange={e => updateAccel("exponent_power", parseFloat(e.target.value))} step="0.1" />
                      </div>
                      
                      <div className="input-group">
                        <label className="input-label">Output Offset</label>
                        <input type="number" className="input-field selectable" value={activeAccel.output_offset} onChange={e => updateAccel("output_offset", parseFloat(e.target.value))} step="0.1" />
                      </div>
                    </>
                  )}

                  {/* ───────────────────────────────────────────────────────── */}
                  {/* SYNCHRONOUS MODE                                            */}
                  {/* ───────────────────────────────────────────────────────── */}
                  {activeAccel.mode === "synchronous" && (
                    <>
                      <div className="input-group">
                        <label className="input-label">Gamma</label>
                        <input type="number" className="input-field selectable" value={activeAccel.gamma} onChange={e => updateAccel("gamma", parseFloat(e.target.value))} step="0.1" />
                      </div>
                      <div className="input-group">
                        <label className="input-label">Smooth</label>
                        <input type="number" className="input-field selectable" value={activeAccel.smooth} onChange={e => updateAccel("smooth", parseFloat(e.target.value))} step="0.1" />
                      </div>
                      <div className="input-group">
                        <label className="input-label">Motivity</label>
                        <input type="number" className="input-field selectable" value={activeAccel.motivity} onChange={e => updateAccel("motivity", parseFloat(e.target.value))} step="0.1" />
                      </div>
                      <div className="input-group">
                        <label className="input-label">Sync Speed</label>
                        <input type="number" className="input-field selectable" value={activeAccel.sync_speed} onChange={e => updateAccel("sync_speed", parseFloat(e.target.value))} step="0.1" />
                      </div>
                    </>
                  )}

                  {/* ───────────────────────────────────────────────────────── */}
                  {/* TIERED MODE                                                 */}
                  {/* ───────────────────────────────────────────────────────── */}
                  {activeAccel.mode === "tiered" && (
                    <>
                      <div className="input-group">
                        <label className="input-label">Type</label>
                        <CustomSelect
                          width="120px"
                          value={activeAccel.t_type}
                          onChange={(val) => updateAccel("t_type", val)}
                          options={[
                            { value: "linear", label: "Linear" },
                            { value: "natural", label: "Natural" }
                          ]}
                        />
                      </div>
                      
                      {activeAccel.t_type === "linear" ? (
                        <>
                          <div className="input-group">
                            <label className="input-label">Multiplier 1</label>
                            <input type="number" className="input-field selectable" value={activeAccel.tiered_multiplier1} onChange={e => updateAccel("tiered_multiplier1", parseFloat(e.target.value))} step="0.1" />
                          </div>
                          <div className="input-group">
                            <label className="input-label">Input Offset 1</label>
                            <input type="number" className="input-field selectable" value={activeAccel.tiered_input_offset1} onChange={e => updateAccel("tiered_input_offset1", parseFloat(e.target.value))} step="0.1" />
                          </div>
                          <div className="input-group">
                            <label className="input-label">Multiplier 2</label>
                            <input type="number" className="input-field selectable" value={activeAccel.tiered_multiplier2} onChange={e => updateAccel("tiered_multiplier2", parseFloat(e.target.value))} step="0.1" />
                          </div>
                          <div className="input-group">
                            <label className="input-label">Transition 1</label>
                            <input type="number" className="input-field selectable" value={activeAccel.tiered_transition1} onChange={e => updateAccel("tiered_transition1", parseFloat(e.target.value))} step="0.1" />
                          </div>
                          <div className="input-group">
                            <label className="input-label">Input Offset 2</label>
                            <input type="number" className="input-field selectable" value={activeAccel.tiered_input_offset2} onChange={e => updateAccel("tiered_input_offset2", parseFloat(e.target.value))} step="0.1" />
                          </div>
                          <div className="input-group">
                            <label className="input-label">Multiplier 3</label>
                            <input type="number" className="input-field selectable" value={activeAccel.tiered_multiplier3} onChange={e => updateAccel("tiered_multiplier3", parseFloat(e.target.value))} step="0.1" />
                          </div>
                          <div className="input-group">
                            <label className="input-label">Transition 2</label>
                            <input type="number" className="input-field selectable" value={activeAccel.tiered_transition2} onChange={e => updateAccel("tiered_transition2", parseFloat(e.target.value))} step="0.1" />
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="input-group">
                            <label className="input-label">Multiplier 1</label>
                            <input type="number" className="input-field selectable" value={activeAccel.tiered_multiplier1} onChange={e => updateAccel("tiered_multiplier1", parseFloat(e.target.value))} step="0.1" />
                          </div>
                          <div className="input-group">
                            <label className="input-label">Input Offset 1</label>
                            <input type="number" className="input-field selectable" value={activeAccel.tiered_input_offset1} onChange={e => updateAccel("tiered_input_offset1", parseFloat(e.target.value))} step="0.1" />
                          </div>
                          <div className="input-group">
                            <label className="input-label">Multiplier 2</label>
                            <input type="number" className="input-field selectable" value={activeAccel.tiered_multiplier2} onChange={e => updateAccel("tiered_multiplier2", parseFloat(e.target.value))} step="0.1" />
                          </div>
                          <div className="input-group">
                            <label className="input-label">Decay Rate 1</label>
                            <input type="number" className="input-field selectable" value={activeAccel.tiered_decay_rate1} onChange={e => updateAccel("tiered_decay_rate1", parseFloat(e.target.value))} step="0.01" />
                          </div>
                          <div className="input-group">
                            <label className="input-label">Input Offset 2</label>
                            <input type="number" className="input-field selectable" value={activeAccel.tiered_input_offset2} onChange={e => updateAccel("tiered_input_offset2", parseFloat(e.target.value))} step="0.1" />
                          </div>
                          <div className="input-group">
                            <label className="input-label">Multiplier 3</label>
                            <input type="number" className="input-field selectable" value={activeAccel.tiered_multiplier3} onChange={e => updateAccel("tiered_multiplier3", parseFloat(e.target.value))} step="0.1" />
                          </div>
                          <div className="input-group">
                            <label className="input-label">Decay Rate 2</label>
                            <input type="number" className="input-field selectable" value={activeAccel.tiered_decay_rate2} onChange={e => updateAccel("tiered_decay_rate2", parseFloat(e.target.value))} step="0.01" />
                          </div>
                        </>
                      )}
                    </>
                  )}

                  {/* ───────────────────────────────────────────────────────── */}
                  {/* LOOKUP TABLE                                                */}
                  {/* ───────────────────────────────────────────────────────── */}
                  {activeAccel.mode === "lookup" && (
                    <>
                      <div className="input-group">
                        <label className="input-label">Apply As</label>
                        <CustomSelect
                          width="120px"
                          value={lookupType}
                          onChange={(val) => setLookupType(val)}
                          options={[
                            { value: "sensitivity", label: "Sensitivity" },
                            { value: "velocity", label: "Velocity" }
                          ]}
                        />
                      </div>
                      <button className="btn btn-primary" style={{ marginTop: "0.5rem", width: "100%" }}>Upload CSV</button>
                    </>
                  )}

                  {activeAccel.mode === "noaccel" && (
                    <div style={{ textAlign: "center", color: "var(--text-muted)", padding: "1rem" }}>
                      Acceleration disabled.
                    </div>
                  )}

                </div>
              </div>

              {/* Advanced Parameters Panel */}
              <div className="panel" style={{ padding: "1.5rem" }}>
                <div className="panel-header" style={{ marginBottom: "1rem", borderBottom: "none", paddingBottom: 0 }}>Advanced Configuration</div>
                
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  
                  {/* General */}
                  <h3 style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginTop: "0.5rem", marginBottom: "-0.25rem" }}>General</h3>
                  <div className="input-group" style={{ margin: 0 }}>
                    <label className="input-label">Sens Multiplier</label>
                    <input type="number" className="input-field selectable" value={profile.yx_output_dpi_ratio} onChange={e => updateProfile("yx_output_dpi_ratio", parseFloat(e.target.value))} step="0.01" />
                  </div>
                  <div className="input-group" style={{ margin: 0 }}>
                    <label className="input-label">Output DPI</label>
                    <input type="number" className="input-field selectable" value={profile.output_dpi} onChange={e => updateProfile("output_dpi", parseFloat(e.target.value))} step="1" />
                  </div>

                  <div style={{ height: "1px", backgroundColor: "var(--border)", margin: "0.5rem 0" }}></div>

                  {/* Anisotropy */}
                  <h3 style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "-0.25rem" }}>Anisotropy (X | Y)</h3>
                  <div className="input-group" style={{ margin: 0 }}>
                    <label className="input-label">Domain Weights</label>
                    <div style={{ display: "flex", gap: "0.25rem", width: "90px" }}>
                      <input type="number" className="input-field selectable" style={{ width: "100%", padding: "0.25rem" }} value={profile.domain_weights.x} onChange={e => updateProfile("domain_weights", { ...profile.domain_weights, x: parseFloat(e.target.value) })} step="0.1" />
                      <input type="number" className="input-field selectable" style={{ width: "100%", padding: "0.25rem" }} value={profile.domain_weights.y} onChange={e => updateProfile("domain_weights", { ...profile.domain_weights, y: parseFloat(e.target.value) })} step="0.1" />
                    </div>
                  </div>
                  <div className="input-group" style={{ margin: 0 }}>
                    <label className="input-label">Range Weights</label>
                    <div style={{ display: "flex", gap: "0.25rem", width: "90px" }}>
                      <input type="number" className="input-field selectable" style={{ width: "100%", padding: "0.25rem" }} value={profile.range_weights.x} onChange={e => updateProfile("range_weights", { ...profile.range_weights, x: parseFloat(e.target.value) })} step="0.1" />
                      <input type="number" className="input-field selectable" style={{ width: "100%", padding: "0.25rem" }} value={profile.range_weights.y} onChange={e => updateProfile("range_weights", { ...profile.range_weights, y: parseFloat(e.target.value) })} step="0.1" />
                    </div>
                  </div>
                  <div className="input-group" style={{ margin: 0 }}>
                    <label className="input-label">LP Norm</label>
                    <input type="number" className="input-field selectable" value={profile.speed_processor_args.lp_norm} onChange={e => updateSpeed("lp_norm", parseFloat(e.target.value))} step="0.1" />
                  </div>

                  <div style={{ height: "1px", backgroundColor: "var(--border)", margin: "0.5rem 0" }}></div>

                  {/* Coalescion */}
                  <h3 style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "-0.25rem" }}>Coalescion (Smooth)</h3>
                  <div className="input-group" style={{ margin: 0 }}>
                    <label className="input-label">Input Half-life</label>
                    <input type="number" className="input-field selectable" value={profile.speed_processor_args.input_speed_smooth_halflife} onChange={e => updateSpeed("input_speed_smooth_halflife", parseFloat(e.target.value))} step="0.1" />
                  </div>
                  <div className="input-group" style={{ margin: 0 }}>
                    <label className="input-label">Scale Half-life</label>
                    <input type="number" className="input-field selectable" value={profile.speed_processor_args.scale_smooth_halflife} onChange={e => updateSpeed("scale_smooth_halflife", parseFloat(e.target.value))} step="0.1" />
                  </div>

                  <div style={{ height: "1px", backgroundColor: "var(--border)", margin: "0.5rem 0" }}></div>

                  {/* Geometry */}
                  <h3 style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "-0.25rem" }}>Geometry</h3>
                  <div className="input-group" style={{ margin: 0 }}>
                    <label className="input-label">Rotation (°)</label>
                    <input type="number" className="input-field selectable" value={profile.degrees_rotation} onChange={e => updateProfile("degrees_rotation", parseFloat(e.target.value))} step="0.1" />
                  </div>
                  <div className="input-group" style={{ margin: 0 }}>
                    <label className="input-label">Angle Snapping</label>
                    <input type="number" className="input-field selectable" value={profile.degrees_snap} onChange={e => updateProfile("degrees_snap", parseFloat(e.target.value))} step="0.1" />
                  </div>
                  <div className="input-group" style={{ margin: 0 }}>
                    <label className="input-label">L/R Ratio</label>
                    <input type="number" className="input-field selectable" value={profile.lr_output_dpi_ratio} onChange={e => updateProfile("lr_output_dpi_ratio", parseFloat(e.target.value))} step="0.01" />
                  </div>
                  <div className="input-group" style={{ margin: 0 }}>
                    <label className="input-label">U/D Ratio</label>
                    <input type="number" className="input-field selectable" value={profile.ud_output_dpi_ratio} onChange={e => updateProfile("ud_output_dpi_ratio", parseFloat(e.target.value))} step="0.01" />
                  </div>

                </div>
              </div>
              
            </div>
            
            {/* Right Column: Full Height Graph */}
            <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden", paddingTop: "0.25rem" }}>
              <CurveGraph argsX={profile.accel_x} argsY={profile.accel_y} maxSpeed={50} maxMultiplier={2} showExtras={showExtras} />
            </div>
            
          </div>
        )}
        
        {activeTab === "devices" && <DevicesView />}
        {activeTab === "mappings" && <MappingsView />}
        
      </main>
    </div>
  );
}

export default App;
