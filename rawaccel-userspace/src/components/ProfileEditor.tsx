import { NumberInput } from "./NumberInput";
import React, { useState } from "react";
import { Profile, AccelArgs } from "../types";
import { CurveGraph } from "./CurveGraph";
import { ChevronDown, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

function Accordion({ title, children, defaultOpen = false }: { title: string, children: React.ReactNode, defaultOpen?: boolean }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  
  return (
    <div className="accordion">
      <div className="accordion-header" onClick={() => setIsOpen(!isOpen)}>
        {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        {title}
      </div>
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ overflow: "hidden" }}
          >
            <div className="accordion-content">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface ProfileEditorProps {
  profile: Profile;
  onChange: (profile: Profile) => void;
}

const safeParseFloat = (val: string) => { const parsed = parseFloat(val); return isNaN(parsed) ? 0 : parsed; };

export function ProfileEditor({ profile, onChange }: ProfileEditorProps) {
  const [activeCurveAxis, setActiveCurveAxis] = useState<"x" | "y">("x");
  const [linkXY, setLinkXY] = useState(true);

  const updateProfile = (key: keyof Profile, value: any) => {
    onChange({ ...profile, [key]: value });
  };

  const updateSpeed = (key: string, value: number) => {
    onChange({
      ...profile,
      speed_processor_args: { ...profile.speed_processor_args, [key]: value }
    });
  };

  const updateAccel = (key: keyof AccelArgs, value: any) => {
    const next = { ...profile };
    if (linkXY) {
      next.accel_x = { ...next.accel_x, [key]: value };
      next.accel_y = { ...next.accel_y, [key]: value };
    } else {
      if (activeCurveAxis === "x") next.accel_x = { ...next.accel_x, [key]: value };
      if (activeCurveAxis === "y") next.accel_y = { ...next.accel_y, [key]: value };
    }
    onChange(next);
  };

  const activeAccel = activeCurveAxis === "x" ? profile.accel_x : profile.accel_y;

  return (
    <div className="main-scroll" style={{ display: "grid", gridTemplateColumns: "350px 1fr" }}>
      
      {/* Left Settings Column */}
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        
        <div className="panel">
          <div className="input-group">
            <label className="input-label">Sens Multiplier</label>
            <NumberInput className="input-field" value={profile.yx_output_dpi_ratio} onChange={e => updateProfile("yx_output_dpi_ratio", safeParseFloat(e.target.value))} step="0.01" />
          </div>
          <div className="input-group">
            <label className="input-label">Output DPI</label>
            <NumberInput className="input-field" value={profile.output_dpi} onChange={e => updateProfile("output_dpi", safeParseFloat(e.target.value))} />
          </div>
        </div>

        <Accordion title="Anisotropy" defaultOpen={true}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", textAlign: "center", marginBottom: "0.5rem" }}>
            <span style={{ fontSize: "0.75rem", fontWeight: "bold" }}>X</span>
            <span style={{ fontSize: "0.75rem", fontWeight: "bold" }}>Y</span>
          </div>
          <div className="input-group">
            <label className="input-label">Domain</label>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <NumberInput className="input-field" style={{ width: "100%" }} value={profile.domain_weights.x} onChange={e => updateProfile("domain_weights", { ...profile.domain_weights, x: safeParseFloat(e.target.value) })} step="0.1" />
              <NumberInput className="input-field" style={{ width: "100%" }} value={profile.domain_weights.y} onChange={e => updateProfile("domain_weights", { ...profile.domain_weights, y: safeParseFloat(e.target.value) })} step="0.1" />
            </div>
          </div>
          <div className="input-group">
            <label className="input-label">Range</label>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <NumberInput className="input-field" style={{ width: "100%" }} value={profile.range_weights.x} onChange={e => updateProfile("range_weights", { ...profile.range_weights, x: safeParseFloat(e.target.value) })} step="0.1" />
              <NumberInput className="input-field" style={{ width: "100%" }} value={profile.range_weights.y} onChange={e => updateProfile("range_weights", { ...profile.range_weights, y: safeParseFloat(e.target.value) })} step="0.1" />
            </div>
          </div>
          <div className="input-group">
            <label className="input-label">LP Norm</label>
            <NumberInput className="input-field" value={profile.speed_processor_args.lp_norm} onChange={e => updateSpeed("lp_norm", safeParseFloat(e.target.value))} step="0.1" />
          </div>
        </Accordion>

        <Accordion title="Coalescion">
          <div className="input-group">
            <label className="input-label">Input Speed</label>
            <NumberInput className="input-field" value={profile.speed_processor_args.input_speed_smooth_halflife} onChange={e => updateSpeed("input_speed_smooth_halflife", safeParseFloat(e.target.value))} />
          </div>
          <div className="input-group">
            <label className="input-label">Scale</label>
            <NumberInput className="input-field" value={profile.speed_processor_args.scale_smooth_halflife} onChange={e => updateSpeed("scale_smooth_halflife", safeParseFloat(e.target.value))} />
          </div>
          <div className="input-group">
            <label className="input-label">Output Speed</label>
            <NumberInput className="input-field" value={profile.speed_processor_args.output_speed_smooth_halflife} onChange={e => updateSpeed("output_speed_smooth_halflife", safeParseFloat(e.target.value))} />
          </div>
        </Accordion>

        <Accordion title="Modifiers">
          <div className="input-group">
            <label className="input-label">Rotation (°)</label>
            <NumberInput className="input-field" value={profile.degrees_rotation} onChange={e => updateProfile("degrees_rotation", safeParseFloat(e.target.value))} />
          </div>
          <div className="input-group">
            <label className="input-label">Angle Snapping (°)</label>
            <NumberInput className="input-field" value={profile.degrees_snap} onChange={e => updateProfile("degrees_snap", safeParseFloat(e.target.value))} />
          </div>
          <div className="input-group">
            <label className="input-label">L/R Ratio</label>
            <NumberInput className="input-field" value={profile.lr_output_dpi_ratio} onChange={e => updateProfile("lr_output_dpi_ratio", safeParseFloat(e.target.value))} step="0.01" />
          </div>
          <div className="input-group">
            <label className="input-label">U/D Ratio</label>
            <NumberInput className="input-field" value={profile.ud_output_dpi_ratio} onChange={e => updateProfile("ud_output_dpi_ratio", safeParseFloat(e.target.value))} step="0.01" />
          </div>
          <div className="input-group">
            <label className="input-label">Speed Min Clamp</label>
            <NumberInput className="input-field" value={profile.speed_min} onChange={e => updateProfile("speed_min", safeParseFloat(e.target.value))} step="0.1" />
          </div>
          <div className="input-group">
            <label className="input-label">Speed Max Clamp</label>
            <NumberInput className="input-field" value={profile.speed_max} onChange={e => updateProfile("speed_max", safeParseFloat(e.target.value))} step="0.1" />
          </div>
        </Accordion>
      </div>

      {/* Right Graph & Curve Column */}
      <div className="panel" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          
          <div style={{ display: "flex", gap: "0.25rem", background: "var(--bg-input)", padding: "0.25rem", borderRadius: "var(--radius-sm)" }}>
            <button className="btn" style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem", background: linkXY ? "var(--color-primary)" : "transparent", color: linkXY ? "#fff" : "var(--text-muted)", border: "none" }} onClick={() => setLinkXY(true)}>Link X/Y</button>
            <button className="btn" style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem", background: !linkXY && activeCurveAxis === "x" ? "var(--color-primary)" : "transparent", color: !linkXY && activeCurveAxis === "x" ? "#fff" : "var(--text-muted)", border: "none" }} onClick={() => { setLinkXY(false); setActiveCurveAxis("x"); }}>X Axis</button>
            <button className="btn" style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem", background: !linkXY && activeCurveAxis === "y" ? "var(--color-primary)" : "transparent", color: !linkXY && activeCurveAxis === "y" ? "#fff" : "var(--text-muted)", border: "none" }} onClick={() => { setLinkXY(false); setActiveCurveAxis("y"); }}>Y Axis</button>
          </div>

          <select className="input-field" style={{ width: "200px" }} value={activeAccel.mode} onChange={e => updateAccel("mode", e.target.value)}>
            <option value="classic">Classic</option>
            <option value="jump">Jump</option>
            <option value="natural">Natural</option>
            <option value="power">Power</option>
            <option value="synchronous">Synchronous</option>
            <option value="lookup">Lookup</option>
            <option value="tiered">Tiered</option>
            <option value="noaccel">No Acceleration</option>
          </select>
        </div>

        <div className="graph-container">
          <CurveGraph argsX={profile.accel_x} argsY={profile.accel_y} showExtras={true} />
        </div>

        {/* Curve Specific Parameters */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem" }}>
          <div>
            <div className="input-group">
              <label className="input-label">Cap Type</label>
              <div style={{ display: "flex", gap: "0.25rem", background: "var(--bg-input)", padding: "0.25rem", borderRadius: "var(--radius-sm)" }}>
                {["in", "out", "io"].map(t => (
                  <button key={t} 
                    className="btn" 
                    onClick={() => updateAccel("cap_mode", t)}
                    style={{ flex: 1, padding: "0.2rem", background: activeAccel.cap_mode === t ? "var(--bg-panel-light)" : "transparent", border: "none" }}
                  >
                    {t.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
            
            {activeAccel.mode !== "tiered" && (
              <>
                <div className="input-group">
                  <label className="input-label">Acceleration</label>
                  <NumberInput className="input-field" value={activeAccel.acceleration} onChange={e => updateAccel("acceleration", safeParseFloat(e.target.value))} step="0.01" />
                </div>
                <div className="input-group">
                  <label className="input-label">Input Offset</label>
                  <NumberInput className="input-field" value={activeAccel.input_offset} onChange={e => updateAccel("input_offset", safeParseFloat(e.target.value))} step="0.1" />
                </div>
              </>
            )}
            

          </div>
          
          <div>
            <div className="input-group">
              <label className="input-label">Cap X</label>
              <NumberInput className="input-field" value={activeAccel.cap.x} onChange={e => updateAccel("cap", { ...activeAccel.cap, x: safeParseFloat(e.target.value) })} step="0.1" />
            </div>
            <div className="input-group">
              <label className="input-label">Cap Y</label>
              <NumberInput className="input-field" value={activeAccel.cap.y} onChange={e => updateAccel("cap", { ...activeAccel.cap, y: safeParseFloat(e.target.value) })} step="0.1" />
            </div>


            
            <div style={{ marginTop: "1.5rem" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
                <input type="checkbox" checked={activeAccel.gain} onChange={e => updateAccel("gain", e.target.checked)} style={{ accentColor: "var(--color-primary)", width: "16px", height: "16px" }} />
                <span style={{ fontSize: "0.85rem", fontWeight: 500 }}>Use Gain (Multiplier)</span>
              </label>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}

