#![allow(dead_code)]

use crate::models::{
    self, accel_args, accel_mode, accel_union, cap_mode, modifier_flags, modifier_settings,
    profile, vec2d,
};
use std::f64::consts::PI;

// ── Rotation ─────────────────────────────────────────────────────────────

fn direction(degrees: f64) -> vec2d {
    let rad = degrees * PI / 180.0;
    vec2d {
        x: rad.cos(),
        y: rad.sin(),
    }
}

// ── Modifier Flags ───────────────────────────────────────────────────────

fn compute_flags(prof: &profile) -> modifier_flags {
    let clamp_speed = prof.speed_max > 0.0 && prof.speed_min <= prof.speed_max;
    let apply_rotate = prof.degrees_rotation != 0.0;
    let apply_snap = prof.degrees_snap != 0.0;
    let apply_directional_weight =
        prof.speed_processor_args.whole && prof.range_weights.x != prof.range_weights.y;
    let compute_ref_angle = apply_snap || apply_directional_weight;

    modifier_flags {
        apply_rotate,
        compute_ref_angle,
        apply_snap,
        clamp_speed,
        apply_directional_weight,
        apply_dir_mul_x: prof.lr_output_dpi_ratio != 1.0,
        apply_dir_mul_y: prof.ud_output_dpi_ratio != 1.0,
    }
}

// ── Utility Functions ────────────────────────────────────────────────────

// ── Curve Structs ────────────────────────────────────────────────────────
// Each mirrors the C++ constructor logic that pre-computes constants
// written into the accel_union for the driver to evaluate at runtime.

// ── Classic ──────────────────────────────────────────────────────────────

#[repr(C)]
struct ClassicLegacy {
    accel_raised: f64,
    cap: f64,
    sign: f64,
}

impl ClassicLegacy {
    fn new(args: &accel_args) -> Self {
        let mut sign = 1.0;
        let mut cap = f64::MAX;
        let accel_raised;

        match args.cap_mode {
            cap_mode::io => {
                cap = args.cap.y - 1.0;
                if cap < 0.0 {
                    cap = -cap;
                    sign = -sign;
                }
                let a = classic_base_accel(args.cap.x, cap, args);
                accel_raised = a.powf(args.exponent_classic - 1.0);
            }
            cap_mode::in_ => {
                accel_raised = args.acceleration.powf(args.exponent_classic - 1.0);
                if args.cap.x > 0.0 {
                    cap = classic_base_fn(args.cap.x, accel_raised, args);
                }
            }
            _ => {
                accel_raised = args.acceleration.powf(args.exponent_classic - 1.0);
                if args.cap.y > 0.0 {
                    cap = args.cap.y - 1.0;
                    if cap < 0.0 {
                        cap = -cap;
                        sign = -sign;
                    }
                }
            }
        }

        Self {
            accel_raised,
            cap,
            sign,
        }
    }
}

#[repr(C)]
struct ClassicGain {
    accel_raised: f64,
    cap: vec2d,
    constant: f64,
    sign: f64,
}

impl ClassicGain {
    fn new(args: &accel_args) -> Self {
        let mut sign = 1.0;
        let mut cap = vec2d {
            x: f64::MAX,
            y: f64::MAX,
        };
        let mut constant = 0.0;
        let accel_raised;

        match args.cap_mode {
            cap_mode::io => {
                cap.x = args.cap.x;
                cap.y = args.cap.y - 1.0;
                if cap.y < 0.0 {
                    cap.y = -cap.y;
                    sign = -sign;
                }
                let a = classic_gain_accel(cap.x, cap.y, args.exponent_classic, args.input_offset);
                accel_raised = a.powf(args.exponent_classic - 1.0);
                constant = (classic_base_fn(cap.x, accel_raised, args) - cap.y) * cap.x;
            }
            cap_mode::in_ => {
                accel_raised = args.acceleration.powf(args.exponent_classic - 1.0);
                if args.cap.x > 0.0 {
                    cap.x = args.cap.x;
                    cap.y = classic_gain(
                        cap.x,
                        args.acceleration,
                        args.exponent_classic,
                        args.input_offset,
                    );
                    constant = (classic_base_fn(cap.x, accel_raised, args) - cap.y) * cap.x;
                }
            }
            _ => {
                accel_raised = args.acceleration.powf(args.exponent_classic - 1.0);
                if args.cap.y > 0.0 {
                    cap.y = args.cap.y - 1.0;
                    if cap.y == 0.0 {
                        cap.x = 0.0;
                    } else {
                        if cap.y < 0.0 {
                            cap.y = -cap.y;
                            sign = -sign;
                        }
                        cap.x = classic_gain_inverse(
                            cap.y,
                            args.acceleration,
                            args.exponent_classic,
                            args.input_offset,
                        );
                        constant = (classic_base_fn(cap.x, accel_raised, args) - cap.y) * cap.x;
                    }
                }
            }
        }

        Self {
            accel_raised,
            cap,
            constant,
            sign,
        }
    }
}

fn classic_base_fn(x: f64, accel_raised: f64, args: &accel_args) -> f64 {
    accel_raised * (x - args.input_offset).powf(args.exponent_classic) / x
}

fn classic_base_accel(x: f64, y: f64, args: &accel_args) -> f64 {
    let power = args.exponent_classic;
    (x * y * (x - args.input_offset).powf(-power)).powf(1.0 / (power - 1.0))
}

fn classic_gain(x: f64, accel: f64, power: f64, offset: f64) -> f64 {
    power * (accel * (x - offset)).powf(power - 1.0)
}

fn classic_gain_inverse(y: f64, accel: f64, power: f64, offset: f64) -> f64 {
    (accel * offset + (y / power).powf(1.0 / (power - 1.0))) / accel
}

fn classic_gain_accel(x: f64, y: f64, power: f64, offset: f64) -> f64 {
    -(y / power).powf(1.0 / (power - 1.0)) / (offset - x)
}

// ── Jump ─────────────────────────────────────────────────────────────────

const JUMP_SMOOTH_SCALE: f64 = 2.0 * PI;

fn jump_smooth_rate(args: &accel_args, step_x: f64) -> f64 {
    let rate_inverse = args.smooth * step_x;
    if rate_inverse < 1.0 {
        0.0
    } else {
        JUMP_SMOOTH_SCALE / rate_inverse
    }
}

fn jump_smooth_antideriv(x: f64, step: vec2d, smooth_rate: f64) -> f64 {
    let decay = (smooth_rate * (step.x - x)).exp();
    step.y * (x + (1.0 + decay).ln() / smooth_rate)
}

#[repr(C)]
struct JumpLegacy {
    step: vec2d,
    smooth_rate: f64,
}

impl JumpLegacy {
    fn new(args: &accel_args) -> Self {
        let step = vec2d {
            x: args.cap.x,
            y: args.cap.y - 1.0,
        };
        let smooth_rate = jump_smooth_rate(args, step.x);
        Self { step, smooth_rate }
    }
}

#[repr(C)]
struct JumpGain {
    step: vec2d,
    smooth_rate: f64,
    c: f64,
}

impl JumpGain {
    fn new(args: &accel_args) -> Self {
        let step = vec2d {
            x: args.cap.x,
            y: args.cap.y - 1.0,
        };
        let smooth_rate = jump_smooth_rate(args, step.x);
        let c = -jump_smooth_antideriv(0.0, step, smooth_rate);
        Self {
            step,
            smooth_rate,
            c,
        }
    }
}

// ── Natural ──────────────────────────────────────────────────────────────

#[repr(C)]
struct NaturalLegacy {
    offset: f64,
    accel: f64,
    limit: f64,
}

impl NaturalLegacy {
    fn new(args: &accel_args) -> Self {
        let limit = args.limit - 1.0;
        let accel = args.decay_rate / limit.abs();
        Self {
            offset: args.input_offset,
            accel,
            limit,
        }
    }
}

#[repr(C)]
struct NaturalGain {
    offset: f64,
    accel: f64,
    limit: f64,
    constant: f64,
}

impl NaturalGain {
    fn new(args: &accel_args) -> Self {
        let limit = args.limit - 1.0;
        let accel = args.decay_rate / limit.abs();
        let constant = -limit / accel;
        Self {
            offset: args.input_offset,
            accel,
            limit,
            constant,
        }
    }
}

// ── Power ────────────────────────────────────────────────────────────────

fn power_gain_fn(input: f64, power: f64, scale: f64) -> f64 {
    (power + 1.0) * (input * scale).powf(power)
}

fn power_gain_inverse(gain: f64, power: f64, scale: f64) -> f64 {
    (gain / (power + 1.0)).powf(1.0 / power) / scale
}

fn power_scale_from_gain_point(input: f64, gain: f64, power: f64) -> f64 {
    (gain / (power + 1.0)).powf(1.0 / power) / input
}

fn power_scale_from_output_point(input: f64, output: f64, power: f64, c: f64) -> f64 {
    (output - c / input).powf(1.0 / power) / input
}

fn power_base_fn(x: f64, args: &accel_args, offset: vec2d, scale: f64, constant: f64) -> f64 {
    if x <= offset.x {
        offset.y
    } else {
        (scale * x).powf(args.exponent_power) + constant / x
    }
}

fn power_integration_constant(input: f64, gain: f64, output: f64) -> f64 {
    (output - gain) * input
}

#[repr(C)]
struct PowerLegacy {
    offset: vec2d,
    scale: f64,
    constant: f64,
    cap: f64,
}

impl PowerLegacy {
    fn new(args: &accel_args) -> Self {
        let n = args.exponent_power;
        let offset;
        let scale;
        let constant;

        // Mirrors C++ power_base constructor: if/else-if/else on cap_mode and gain
        if args.cap_mode != cap_mode::io {
            scale = args.scale;
        } else if args.gain {
            scale = power_scale_from_gain_point(args.cap.x, args.cap.y, n);
        } else {
            // Legacy + io cap mode: offset ignored due to circular dependency
            let s = power_scale_from_output_point(args.cap.x, args.cap.y, n, 0.0);
            return Self {
                offset: vec2d::default(),
                scale: s,
                constant: 0.0,
                cap: args.cap.y,
            };
        }

        offset = vec2d {
            x: power_gain_inverse(args.output_offset, n, scale),
            y: args.output_offset,
        };
        constant = offset.x * offset.y * n / (n + 1.0);

        let mut cap = f64::MAX;
        match args.cap_mode {
            cap_mode::io => {
                cap = args.cap.y;
            }
            cap_mode::in_ => {
                if args.cap.x > 0.0 {
                    cap = power_base_fn(args.cap.x, args, offset, scale, constant);
                }
            }
            _ => {
                if args.cap.y > 0.0 {
                    cap = args.cap.y;
                }
            }
        }

        Self {
            offset,
            scale,
            constant,
            cap,
        }
    }
}

#[repr(C)]
struct PowerGain {
    offset: vec2d,
    scale: f64,
    constant: f64,
    cap: vec2d,
    constant_b: f64,
}

impl PowerGain {
    fn new(args: &accel_args) -> Self {
        let n = args.exponent_power;
        let mut offset = vec2d::default();
        let scale;
        let constant;

        if args.cap_mode != cap_mode::io {
            scale = args.scale;
        } else if args.gain {
            scale = power_scale_from_gain_point(args.cap.x, args.cap.y, n);
        } else {
            let s = power_scale_from_output_point(args.cap.x, args.cap.y, n, 0.0);
            return Self {
                offset: vec2d::default(),
                scale: s,
                constant: 0.0,
                cap: vec2d {
                    x: f64::MAX,
                    y: f64::MAX,
                },
                constant_b: 0.0,
            };
        }

        offset.x = power_gain_inverse(args.output_offset, n, scale);
        offset.y = args.output_offset;
        constant = offset.x * offset.y * n / (n + 1.0);

        let mut cap = vec2d {
            x: f64::MAX,
            y: f64::MAX,
        };
        let constant_b;

        match args.cap_mode {
            cap_mode::io => {
                cap = args.cap;
                constant_b = power_integration_constant(
                    cap.x,
                    cap.y,
                    power_base_fn(cap.x, args, offset, scale, constant),
                );
            }
            cap_mode::in_ => {
                if args.cap.x > 0.0 {
                    if args.cap.x <= offset.x {
                        return Self {
                            offset,
                            scale,
                            constant,
                            cap: vec2d {
                                x: 0.0,
                                y: offset.y,
                            },
                            constant_b: 0.0,
                        };
                    }
                    cap.x = args.cap.x;
                    cap.y = power_gain_fn(args.cap.x, n, scale);
                }
                constant_b = power_integration_constant(
                    cap.x,
                    cap.y,
                    power_base_fn(cap.x, args, offset, scale, constant),
                );
            }
            _ => {
                if args.cap.y > 0.0 {
                    cap.x = power_gain_inverse(args.cap.y, n, scale);
                    cap.y = args.cap.y;
                }
                constant_b = power_integration_constant(
                    cap.x,
                    cap.y,
                    power_base_fn(cap.x, args, offset, scale, constant),
                );
            }
        }

        Self {
            offset,
            scale,
            constant,
            cap,
            constant_b,
        }
    }
}

// ── Tiered ───────────────────────────────────────────────────────────────

#[repr(C)]
struct TieredLinearLegacy {
    m1: f64,
    x1: f64,
    m2: f64,
    x1_end: f64,
    inv_trans1: f64,
    m3: f64,
    x2: f64,
    x2_end: f64,
    inv_trans2: f64,
}

impl TieredLinearLegacy {
    fn new(args: &accel_args) -> Self {
        let inv_trans1 = if args.tiered_transition1 > 0.0 {
            1.0 / args.tiered_transition1
        } else {
            0.0
        };
        let inv_trans2 = if args.tiered_transition2 > 0.0 {
            1.0 / args.tiered_transition2
        } else {
            0.0
        };
        Self {
            m1: args.tiered_multiplier1,
            x1: args.tiered_input_offset1,
            m2: args.tiered_multiplier2,
            x1_end: args.tiered_input_offset1 + args.tiered_transition1,
            inv_trans1,
            m3: args.tiered_multiplier3,
            x2: args.tiered_input_offset2,
            x2_end: args.tiered_input_offset2 + args.tiered_transition2,
            inv_trans2,
        }
    }
}

#[repr(C)]
struct TieredNaturalLegacy {
    m1: f64,
    x1: f64,
    l1: f64,
    a1: f64,
    x2: f64,
    v2: f64,
    m2_prime: f64,
    l2: f64,
    a2: f64,
}

impl TieredNaturalLegacy {
    fn new(args: &accel_args) -> Self {
        let m1 = args.tiered_multiplier1;
        let x1 = args.tiered_input_offset1;
        let v1 = m1 * x1;

        let l1 = args.tiered_multiplier2 - m1;
        let a1 = if l1 != 0.0 {
            args.tiered_decay_rate1 / l1.abs()
        } else {
            0.0
        };

        let x2 = args.tiered_input_offset2;
        let dx1 = x2 - x1;

        let decay1 = if l1 != 0.0 { (-a1 * dx1).exp() } else { 1.0 };
        let v2 = if l1 != 0.0 {
            v1 + m1 * dx1 + l1 * dx1 * (1.0 - decay1)
        } else {
            v1 + m1 * dx1
        };
        let m2_prime = if l1 != 0.0 {
            m1 + l1 * (1.0 - decay1 + dx1 * a1 * decay1)
        } else {
            m1
        };

        let l2 = args.tiered_multiplier3 - m2_prime;
        let a2 = if l2 != 0.0 {
            args.tiered_decay_rate2 / l2.abs()
        } else {
            0.0
        };

        Self {
            m1,
            x1,
            l1,
            a1,
            x2,
            v2,
            m2_prime,
            l2,
            a2,
        }
    }
}

#[repr(C)]
struct TieredNaturalGain {
    m1: f64,
    x1: f64,
    l1: f64,
    a1: f64,
    x2: f64,
    v2: f64,
    m2_prime: f64,
    l2: f64,
    a2: f64,
}

impl TieredNaturalGain {
    fn new(args: &accel_args) -> Self {
        let m1 = args.tiered_multiplier1;
        let x1 = args.tiered_input_offset1;
        let v1 = m1 * x1;

        let l1 = args.tiered_multiplier2 - m1;
        let a1 = if l1 != 0.0 {
            args.tiered_decay_rate1 / l1.abs()
        } else {
            0.0
        };

        let x2 = args.tiered_input_offset2;
        let dx1 = x2 - x1;

        let decay1 = if l1 != 0.0 { (-a1 * dx1).exp() } else { 1.0 };
        let v2 = if l1 != 0.0 {
            v1 + m1 * dx1 + l1 * (dx1 - (1.0 - decay1) / a1)
        } else {
            v1 + m1 * dx1
        };
        let m2_prime = if l1 != 0.0 {
            m1 + l1 * (1.0 - decay1)
        } else {
            m1
        };

        let l2 = args.tiered_multiplier3 - m2_prime;
        let a2 = if l2 != 0.0 {
            args.tiered_decay_rate2 / l2.abs()
        } else {
            0.0
        };

        Self {
            m1,
            x1,
            l1,
            a1,
            x2,
            v2,
            m2_prime,
            l2,
            a2,
        }
    }
}

// ── Lookup ───────────────────────────────────────────────────────────────
// Lookup stores size and velocity flag. Points live in accel_args.data[].

#[repr(C)]
struct Lookup {
    size: i32,
    velocity: bool,
}

impl Lookup {
    fn new(args: &accel_args) -> Self {
        Self {
            size: args.length / 2,
            velocity: args.gain,
        }
    }
}

// ── Synchronous (activation_framework) ───────────────────────────────────
// Legacy variant stores pre-computed log/gamma constants.
// Gain variant fills accel_args.data[] via numerical integration.

#[repr(C)]
struct SynchronousLegacy {
    log_motivity: f64,
    gamma_const: f64,
    log_syncspeed: f64,
    syncspeed: f64,
    sharpness: f64,
    sharpness_recip: f64,
    use_linear_clamp: bool,
    minimum_sens: f64,
    maximum_sens: f64,
}

impl SynchronousLegacy {
    fn new(args: &accel_args) -> Self {
        let log_motivity = args.motivity.ln();
        let gamma_const = args.gamma / log_motivity;
        let sharpness = if args.smooth == 0.0 {
            16.0
        } else {
            0.5 / args.smooth
        };

        Self {
            log_motivity,
            gamma_const,
            log_syncspeed: args.sync_speed.ln(),
            syncspeed: args.sync_speed,
            sharpness,
            sharpness_recip: 1.0 / sharpness,
            use_linear_clamp: sharpness >= 16.0,
            minimum_sens: 1.0 / args.motivity,
            maximum_sens: args.motivity,
        }
    }

    fn evaluate(&self, x: f64) -> f64 {
        if self.use_linear_clamp {
            let log_space = self.gamma_const * (x.ln() - self.log_syncspeed);
            if log_space < -1.0 {
                return self.minimum_sens;
            }
            if log_space > 1.0 {
                return self.maximum_sens;
            }
            return (log_space * self.log_motivity).exp();
        }

        if x == self.syncspeed {
            return 1.0;
        }

        let log_x = x.ln();
        let log_diff = log_x - self.log_syncspeed;

        if log_diff > 0.0 {
            let log_space = self.gamma_const * log_diff;
            let exponent = log_space
                .powf(self.sharpness)
                .tanh()
                .powf(self.sharpness_recip);
            (exponent * self.log_motivity).exp()
        } else {
            let log_space = -self.gamma_const * log_diff;
            let exponent = -(log_space
                .powf(self.sharpness)
                .tanh()
                .powf(self.sharpness_recip));
            (exponent * self.log_motivity).exp()
        }
    }
}

#[repr(C)]
struct SynchronousGain {
    velocity: bool,
    range_start: i32,
    range_stop: i32,
    range_num: i32,
    x_start: f64,
}

impl SynchronousGain {
    fn new(args: &mut accel_args) -> Self {
        let range_start = -3i32;
        let range_stop = 9i32;
        let range_num = 8i32;
        let velocity = true;
        let x_start = (1.0f64).powi(range_start) * 2.0f64.powi(range_start);

        let sig = SynchronousLegacy::new(args);

        let mut sum = 0.0f64;
        let mut a = 0.0f64;
        let mut idx = 0usize;

        for e in 0..(range_stop - range_start) {
            let exp_scale = 2.0f64.powi(e + range_start) / range_num as f64;
            for i in 0..range_num {
                let x = (i + range_num) as f64 * exp_scale;

                let partitions = 2;
                let interval = (x - a) / partitions as f64;
                for p in 1..=partitions {
                    sum += sig.evaluate(a + p as f64 * interval) * interval;
                }
                a = x;

                let mut y = sum;
                if velocity {
                    y /= x;
                }

                if idx < models::LUT_RAW_DATA_CAPACITY {
                    args.data[idx] = y as f32;
                    idx += 1;
                }
            }
        }

        // Final point at 2^stop
        let x_final = 2.0f64.powi(range_stop);
        let partitions = 2;
        let interval = (x_final - a) / partitions as f64;
        for p in 1..=partitions {
            sum += sig.evaluate(a + p as f64 * interval) * interval;
        }
        let mut y = sum;
        if velocity {
            y /= x_final;
        }
        if idx < models::LUT_RAW_DATA_CAPACITY {
            args.data[idx] = y as f32;
        }

        Self {
            velocity,
            range_start,
            range_stop,
            range_num,
            x_start,
        }
    }
}

// ── Noaccel ──────────────────────────────────────────────────────────────

#[repr(C)]
struct Noaccel;

// ── Union Initialization ─────────────────────────────────────────────────

fn init_accel_union(union: &mut accel_union, args: &mut accel_args) {
    match args.mode {
        accel_mode::classic => {
            if args.gain {
                let curve = ClassicGain::new(args);
                union.write(&curve);
            } else {
                let curve = ClassicLegacy::new(args);
                union.write(&curve);
            }
        }
        accel_mode::jump => {
            if args.gain {
                let curve = JumpGain::new(args);
                union.write(&curve);
            } else {
                let curve = JumpLegacy::new(args);
                union.write(&curve);
            }
        }
        accel_mode::natural => {
            if args.gain {
                let curve = NaturalGain::new(args);
                union.write(&curve);
            } else {
                let curve = NaturalLegacy::new(args);
                union.write(&curve);
            }
        }
        accel_mode::power => {
            if args.gain {
                let curve = PowerGain::new(args);
                union.write(&curve);
            } else {
                let curve = PowerLegacy::new(args);
                union.write(&curve);
            }
        }
        accel_mode::tiered => {
            if args.t_type == models::tiered_type::linear {
                let curve = TieredLinearLegacy::new(args);
                union.write(&curve);
            } else if args.gain {
                let curve = TieredNaturalGain::new(args);
                union.write(&curve);
            } else {
                let curve = TieredNaturalLegacy::new(args);
                union.write(&curve);
            }
        }
        accel_mode::synchronous => {
            if args.gain {
                let curve = SynchronousGain::new(args);
                union.write(&curve);
            } else {
                let curve = SynchronousLegacy::new(args);
                union.write(&curve);
            }
        }
        accel_mode::lookup => {
            let curve = Lookup::new(args);
            union.write(&curve);
        }
        accel_mode::noaccel => {
            // No-op.
        }
    }
}

// ── Public Entry Point ───────────────────────────────────────────────────

pub fn init_data(settings: &mut modifier_settings) {
    init_accel_union(&mut settings.data.accel_x, &mut settings.prof.accel_x);
    init_accel_union(&mut settings.data.accel_y, &mut settings.prof.accel_y);
    settings.data.rot_direction = direction(settings.prof.degrees_rotation);
    settings.data.flags = compute_flags(&settings.prof);
}
