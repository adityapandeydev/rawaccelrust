use serde::{Deserialize, Serialize};
use crate::models;

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct AppConfig {
    pub profiles: Vec<AppProfile>,
}

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
        prof.lr_output_dpi_ratio = self.lr_output_dpi_ratio;
        prof.ud_output_dpi_ratio = self.ud_output_dpi_ratio;
        prof.output_dpi = self.output_dpi;
        prof.yx_output_dpi_ratio = self.yx_output_dpi_ratio;
        prof.range_weights = models::vec2d { x: self.range_weights.x, y: self.range_weights.y };
        prof.domain_weights = models::vec2d { x: self.domain_weights.x, y: self.domain_weights.y };

        prof.speed_processor_args = models::speed_args {
            whole: self.speed_processor_args.whole,
            lp_norm: self.speed_processor_args.lp_norm,
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
            "jump" => models::accel_mode::jump,
            "natural" => models::accel_mode::natural,
            "synchronous" => models::accel_mode::synchronous,
            "power" => models::accel_mode::power,
            "lookup" => models::accel_mode::lookup,
            _ => models::accel_mode::noaccel,
        };
        args.gain = self.gain;
        args.input_offset = self.input_offset;
        args.output_offset = self.output_offset;
        args.acceleration = self.acceleration;
        args.decay_rate = self.decay_rate;
        args.gamma = self.gamma;
        args.motivity = self.motivity;
        args.exponent_classic = self.exponent_classic;
        args.scale = self.scale;
        args.exponent_power = self.exponent_power;
        args.limit = self.limit;
        args.sync_speed = self.sync_speed;
        args.smooth = self.smooth;
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
