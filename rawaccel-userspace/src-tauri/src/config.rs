use serde::{Deserialize, Serialize};
use crate::models;

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct AppConfig {
    pub profiles: Vec<AppProfile>,
    #[serde(default)]
    pub devices: Vec<AppDeviceConfig>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct AppDeviceConfig {
    pub id: String,
    pub profile_id: Option<String>,
    #[serde(default)]
    pub disable: bool,
    #[serde(default)]
    pub set_extra_info: bool,
    #[serde(default = "default_poll_time_lock")]
    pub poll_time_lock: bool,
    #[serde(default)]
    pub dpi: u32,
    #[serde(default)]
    pub polling_rate: u32,
    #[serde(default)]
    pub clamp_min: f64,
    #[serde(default)]
    pub clamp_max: f64,
}

fn default_poll_time_lock() -> bool { false }

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct AppProfile {
    #[serde(default)]
    pub id: String,
    #[serde(default)]
    pub name: String,
    pub domain_weights: AppVec2D,
    pub range_weights: AppVec2D,
    pub accel_x: AppAccelArgs,
    pub accel_y: AppAccelArgs,
    pub speed_processor_args: AppSpeedArgs,
    pub output_dpi: f64,
    pub yx_output_dpi_ratio: f64,
    pub lr_output_dpi_ratio: f64,
    pub ud_output_dpi_ratio: f64,
    pub degrees_rotation: f64,
    pub degrees_snap: f64,
    pub speed_min: f64,
    pub speed_max: f64,
}

#[derive(Serialize, Deserialize, Clone, Debug, Default)]
pub struct AppVec2D {
    #[serde(default)]
    pub x: f64,
    #[serde(default)]
    pub y: f64,
}

#[derive(Serialize, Deserialize, Clone, Debug, Default)]
pub struct AppSpeedArgs {
    #[serde(default)]
    pub whole: bool,
    #[serde(default)]
    pub lp_norm: f64,
    #[serde(default)]
    pub input_speed_smooth_halflife: f64,
    #[serde(default)]
    pub scale_smooth_halflife: f64,
    #[serde(default)]
    pub output_speed_smooth_halflife: f64,
}

#[derive(Serialize, Deserialize, Clone, Debug, Default)]
pub struct AppAccelArgs {
    #[serde(default)]
    pub mode: String,
    #[serde(default)]
    pub gain: bool,
    #[serde(default)]
    pub input_offset: f64,
    #[serde(default)]
    pub output_offset: f64,
    #[serde(default)]
    pub acceleration: f64,
    #[serde(default)]
    pub decay_rate: f64,
    #[serde(default)]
    pub gamma: f64,
    #[serde(default)]
    pub motivity: f64,
    #[serde(default)]
    pub exponent_classic: f64,
    #[serde(default)]
    pub scale: f64,
    #[serde(default)]
    pub exponent_power: f64,
    #[serde(default)]
    pub limit: f64,
    #[serde(default)]
    pub sync_speed: f64,
    #[serde(default)]
    pub smooth: f64,
    #[serde(default)]
    pub t_type: String,
    #[serde(default)]
    pub tiered_multiplier1: f64,
    #[serde(default)]
    pub tiered_input_offset1: f64,
    #[serde(default)]
    pub tiered_multiplier2: f64,
    #[serde(default)]
    pub tiered_transition1: f64,
    #[serde(default)]
    pub tiered_input_offset2: f64,
    #[serde(default)]
    pub tiered_multiplier3: f64,
    #[serde(default)]
    pub tiered_transition2: f64,
    #[serde(default)]
    pub tiered_decay_rate1: f64,
    #[serde(default)]
    pub tiered_decay_rate2: f64,
    #[serde(default)]
    pub cap: AppVec2D,
    #[serde(default)]
    pub cap_mode: String,
    #[serde(default)]
    pub length: i32,
}

impl AppProfile {
    pub fn to_native(&self) -> models::profile {
        let mut prof = models::profile::default();

        let mut name_u16 = [0u16; models::MAX_NAME_LEN];
        for (i, c) in self.name.encode_utf16().enumerate().take(models::MAX_NAME_LEN - 1) {
            name_u16[i] = c;
        }
        prof.name = name_u16;

        prof.accel_x = self.accel_x.to_native();
        prof.accel_y = self.accel_y.to_native();
        prof.degrees_rotation = self.degrees_rotation;
        prof.degrees_snap = self.degrees_snap;
        prof.speed_min = self.speed_min;
        prof.speed_max = self.speed_max;
        prof.lr_output_dpi_ratio = if self.lr_output_dpi_ratio <= 0.0 { 1.0 } else { self.lr_output_dpi_ratio };
        prof.ud_output_dpi_ratio = if self.ud_output_dpi_ratio <= 0.0 { 1.0 } else { self.ud_output_dpi_ratio };
        prof.output_dpi = if self.output_dpi <= 0.0 { 1000.0 } else { self.output_dpi };
        prof.yx_output_dpi_ratio = if self.yx_output_dpi_ratio <= 0.0 { 1.0 } else { self.yx_output_dpi_ratio };
        prof.range_weights = models::vec2d { x: if self.range_weights.x < 0.0 { 1.0 } else { self.range_weights.x }, y: if self.range_weights.y < 0.0 { 1.0 } else { self.range_weights.y } };
        prof.domain_weights = models::vec2d { x: if self.domain_weights.x <= 0.0 { 1.0 } else { self.domain_weights.x }, y: if self.domain_weights.y <= 0.0 { 1.0 } else { self.domain_weights.y } };

        prof.speed_processor_args = models::speed_args {
            whole: self.speed_processor_args.whole,
            lp_norm: if self.speed_processor_args.lp_norm <= 0.0 { 2.0 } else { self.speed_processor_args.lp_norm },
            input_speed_smooth_halflife: self.speed_processor_args.input_speed_smooth_halflife,
            scale_smooth_halflife: self.speed_processor_args.scale_smooth_halflife,
            output_speed_smooth_halflife: self.speed_processor_args.output_speed_smooth_halflife,
        };

        prof
    }
}

impl AppAccelArgs {
    pub fn to_native(&self) -> models::accel_args {
        let mut args = models::accel_args::default();

        args.mode = match self.mode.as_str() {
            "classic" => models::accel_mode::classic,
            "linear" => models::accel_mode::classic,
            "jump" => models::accel_mode::jump,
            "natural" => models::accel_mode::natural,
            "synchronous" => models::accel_mode::synchronous,
            "power" => models::accel_mode::power,
            "lookup" => models::accel_mode::lookup,
            "tiered" => models::accel_mode::tiered,
            _ => models::accel_mode::noaccel,
        };
        args.gain = self.gain;
        args.input_offset = self.input_offset;
        args.output_offset = self.output_offset;
        args.acceleration = if self.acceleration <= 0.0 { 0.001 } else { self.acceleration };
        args.decay_rate = if self.decay_rate <= 0.0 { 0.1 } else { self.decay_rate };
        args.gamma = if self.gamma <= 0.0 { 1.0 } else { self.gamma };
        args.motivity = if self.motivity <= 1.0 { 1.5 } else { self.motivity };
        args.exponent_classic = if self.mode.as_str() == "linear" {
            2.0
        } else {
            self.exponent_classic
        };
        args.scale = if self.scale <= 0.0 { 1.0 } else { self.scale };
        args.exponent_power = if self.exponent_power <= 0.0 { 0.05 } else { self.exponent_power };
        args.limit = if self.limit <= 0.0 { 2.0 } else { self.limit };
        args.sync_speed = if self.sync_speed <= 0.0 { 5.0 } else { self.sync_speed };
        args.smooth = if self.smooth < 0.0 || self.smooth > 1.0 { 0.0 } else { self.smooth };
        args.t_type = match self.t_type.as_str() {
            "natural" => models::tiered_type::natural,
            _ => models::tiered_type::linear,
        };
        args.tiered_multiplier1 = self.tiered_multiplier1;
        args.tiered_input_offset1 = self.tiered_input_offset1;
        args.tiered_multiplier2 = self.tiered_multiplier2;
        args.tiered_transition1 = self.tiered_transition1;
        args.tiered_input_offset2 = self.tiered_input_offset2;
        args.tiered_multiplier3 = self.tiered_multiplier3;
        args.tiered_transition2 = self.tiered_transition2;
        args.tiered_decay_rate1 = self.tiered_decay_rate1;
        args.tiered_decay_rate2 = self.tiered_decay_rate2;
        args.cap = models::vec2d { x: self.cap.x, y: self.cap.y };
        args.cap_mode = match self.cap_mode.as_str() {
            "in" => models::cap_mode::in_,
            "io" => models::cap_mode::io,
            _ => models::cap_mode::out,
        };
        args.length = 0;

        args
    }
}

