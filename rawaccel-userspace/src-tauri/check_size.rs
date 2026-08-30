
pub const LUT_RAW_DATA_CAPACITY: usize = 514;
pub const MAX_NAME_LEN: usize = 256;

#[repr(i32)]
pub enum accel_mode { classic = 0, noaccel = 7 }

#[repr(i32)]
pub enum cap_mode { io = 0, in_ = 1, out = 2 }

#[repr(C)]
pub struct vec2d { pub x: f64, pub y: f64 }

#[repr(C)]
pub struct accel_args {
    pub mode: accel_mode,
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
    pub cap: vec2d,
    pub cap_mode: cap_mode,
    pub length: i32,
    pub data: [f32; LUT_RAW_DATA_CAPACITY],
}

#[repr(C)]
pub struct speed_args {
    pub whole: bool,
    pub lp_norm: f64,
    pub input_speed_smooth_halflife: f64,
    pub scale_smooth_halflife: f64,
    pub output_speed_smooth_halflife: f64,
}

#[repr(C)]
pub struct profile {
    pub name: [u16; MAX_NAME_LEN],
    pub domain_weights: vec2d,
    pub range_weights: vec2d,
    pub accel_x: accel_args,
    pub accel_y: accel_args,
    pub speed_processor_args: speed_args,
    pub output_dpi: f64,
    pub yx_output_dpi_ratio: f64,
    pub lr_output_dpi_ratio: f64,
    pub ud_output_dpi_ratio: f64,
    pub degrees_rotation: f64,
    pub degrees_snap: f64,
    pub speed_min: f64,
    pub speed_max: f64,
}

fn main() {
    println!("accel_args size: {}", std::mem::size_of::<accel_args>());
    println!("speed_args size: {}", std::mem::size_of::<speed_args>());
    println!("profile size: {}", std::mem::size_of::<profile>());
}
