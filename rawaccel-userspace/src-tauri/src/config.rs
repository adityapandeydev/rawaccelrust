use serde::{Deserialize, Serialize};
use crate::models;

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct AppConfig {
    pub profiles: Vec<AppProfile>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct AppProfile {
    pub accel_x: AppAccelArgs,
    pub accel_y: AppAccelArgs,
    pub degrees_rotation: f64,
    pub degrees_snap: f64,
    pub speed_min: f64,
    pub speed_max: f64,
    pub lr_output_dpi_ratio: f64,
    pub ud_output_dpi_ratio: f64,
    pub range_weights: [f64; 2],
    pub domain_weights: [f64; 2],
    pub output_dpi: f64,
    pub yx_output_dpi_ratio: f64,
    pub speed_processor: AppSpeedArgs,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct AppSpeedArgs {
    pub whole: bool,
    pub lp_norm: f64,
    pub input_speed_smooth_halflife: f64,
    pub scale_smooth_halflife: f64,
    pub output_speed_smooth_halflife: f64,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct AppAccelArgs {
    pub mode: i32,
    pub gain: bool,
    pub input_offset: f64,
    pub output_offset: f64,
    pub acceleration: f64,
    pub decay_rate: f64,
    pub gamma: f64,
    pub motivity: f64,
    pub exponent_classic: f64,
    pub scale: f64,
    pub exponent_power: f64,
    pub limit: f64,
    pub sync_speed: f64,
    pub smooth: f64,
    pub speed1: f64,
    pub speed2: f64,
    pub mid_cap: f64,
    pub speed3: f64,
    pub speed4: f64,
    pub final_cap: f64,
    pub cap: [f64; 2],
    pub cap_mode: i32,
    pub length: i32,
}

impl AppProfile {
    pub fn to_native(&self) -> models::profile {
        let mut prof = models::profile::default();

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
        prof.range_weights = models::vec2d { x: self.range_weights[0], y: self.range_weights[1] };
        prof.domain_weights = models::vec2d { x: self.domain_weights[0], y: self.domain_weights[1] };

        prof.speed_processor_args = models::speed_args {
            whole: self.speed_processor.whole,
            lp_norm: self.speed_processor.lp_norm,
            input_speed_smooth_halflife: self.speed_processor.input_speed_smooth_halflife,
            scale_smooth_halflife: self.speed_processor.scale_smooth_halflife,
            output_speed_smooth_halflife: self.speed_processor.output_speed_smooth_halflife,
        };

        prof
    }
}

impl AppAccelArgs {
    pub fn to_native(&self) -> models::accel_args {
        let mut args = models::accel_args::default();

        args.mode = unsafe { std::mem::transmute(self.mode) };
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
        args.speed1 = self.speed1;
        args.speed2 = self.speed2;
        args.mid_cap = self.mid_cap;
        args.speed3 = self.speed3;
        args.speed4 = self.speed4;
        args.final_cap = self.final_cap;
        args.cap = models::vec2d { x: self.cap[0], y: self.cap[1] };
        args.cap_mode = unsafe { std::mem::transmute(self.cap_mode) };
        args.length = self.length;

        args
    }
}
