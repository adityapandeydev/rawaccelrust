export interface Vec2D {
  x: number;
  y: number;
}

export interface AccelArgs {
  mode: string; // "classic", "jump", "natural", "power", "synchronous", "lookup", "tiered", "noaccel"
  gain: boolean;
  input_offset: number;
  output_offset: number;
  acceleration: number;
  decay_rate: number;
  gamma: number;
  motivity: number;
  exponent_classic: number;
  scale: number;
  exponent_power: number;
  limit: number;
  sync_speed: number;
  smooth: number;
  
  // Tiered specific
  speed1: number;
  speed2: number;
  mid_cap: number;
  speed3: number;
  speed4: number;
  final_cap: number;

  cap: Vec2D;
  cap_mode: "in" | "out" | "io";
}

export interface SpeedArgs {
  whole: boolean;
  lp_norm: number;
  input_speed_smooth_halflife: number;
  scale_smooth_halflife: number;
  output_speed_smooth_halflife: number;
}

export interface Profile {
  id: string; // Frontend only identifier
  name: string;
  domain_weights: Vec2D;
  range_weights: Vec2D;
  accel_x: AccelArgs;
  accel_y: AccelArgs;
  speed_processor_args: SpeedArgs;
  output_dpi: number;
  yx_output_dpi_ratio: number;
  lr_output_dpi_ratio: number;
  ud_output_dpi_ratio: number;
  degrees_rotation: number;
  degrees_snap: number;
  speed_min: number;
  speed_max: number;
}

export interface DeviceConfig {
  disable: boolean;
  set_extra_info: boolean;
  poll_time_lock: boolean;
  dpi: number;
  polling_rate: number;
  clamp_min: number;
  clamp_max: number;
}

export interface Device {
  id: string;
  name: string;
  profile_id: string | null;
  config: DeviceConfig;
}

// ── Default Generators ──────────────────────────────────────────────────

export const defaultAccelArgs = (): AccelArgs => ({
  mode: "noaccel",
  gain: false,
  input_offset: 0,
  output_offset: 0,
  acceleration: 0,
  decay_rate: 0.1,
  gamma: 1,
  motivity: 1.5,
  exponent_classic: 2,
  scale: 1,
  exponent_power: 2,
  limit: 2,
  sync_speed: 10,
  smooth: 0,
  speed1: 1,
  speed2: 1.5,
  mid_cap: 10,
  speed3: 1.5,
  speed4: 2,
  final_cap: 30,
  cap: { x: 0, y: 0 },
  cap_mode: "out"
});

export const defaultSpeedArgs = (): SpeedArgs => ({
  whole: true,
  lp_norm: 2.0,
  input_speed_smooth_halflife: 0,
  scale_smooth_halflife: 0,
  output_speed_smooth_halflife: 0
});

export const defaultProfile = (name: string = "Default Profile"): Profile => ({
  id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
  name,
  domain_weights: { x: 1, y: 1 },
  range_weights: { x: 1, y: 1 },
  accel_x: defaultAccelArgs(),
  accel_y: defaultAccelArgs(),
  speed_processor_args: defaultSpeedArgs(),
  output_dpi: 1000,
  yx_output_dpi_ratio: 1,
  lr_output_dpi_ratio: 1,
  ud_output_dpi_ratio: 1,
  degrees_rotation: 0,
  degrees_snap: 0,
  speed_min: 0,
  speed_max: 0
});
