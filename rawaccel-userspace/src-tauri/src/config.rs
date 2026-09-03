use crate::models;
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct AppConfig {
    pub profiles: Vec<AppProfile>,
    #[serde(default)]
    pub devices: Vec<AppDeviceConfig>,
}

impl AppConfig {
    /// Validates data that is used directly by the driver.
    /// Ensures profiles exist, have unique non-empty names, and mapped devices reference existing profiles.
    pub fn validate(&self) -> Result<(), String> {
        if self.profiles.is_empty() {
            return Err("At least one profile is required".to_string());
        }

        let mut profile_names = std::collections::HashSet::new();
        for profile in &self.profiles {
            let trimmed = profile.name.trim();
            if trimmed.is_empty() {
                return Err("Profile name cannot be empty".to_string());
            }
            if !profile_names.insert(trimmed.to_lowercase()) {
                return Err(format!("Duplicate profile name '{}'", profile.name));
            }

            validate_lookup_table(&profile.name, "X", &profile.accel_x)?;

            if !profile.speed_processor_args.whole {
                validate_lookup_table(&profile.name, "Y", &profile.accel_y)?;
            }
        }

        for dev in &self.devices {
            if let Some(ref pid) = dev.profile_id {
                if !self.profiles.iter().any(|p| p.name == *pid) {
                    return Err(format!(
                        "Device '{}' references non-existent profile '{}'",
                        dev.id, pid
                    ));
                }
            }
        }

        Ok(())
    }
}

fn validate_lookup_table(
    profile_name: &str,
    axis: &str,
    args: &AppAccelArgs,
) -> Result<(), String> {
    if args.mode != "lookup" {
        return Ok(());
    }

    let points = &args.lookup_table;
    let max_points = models::LUT_POINTS_CAPACITY;
    if points.len() < 2 {
        return Err(format!(
            "Profile '{profile_name}' {axis} lookup table needs at least two points"
        ));
    }
    if points.len() > max_points {
        return Err(format!(
            "Profile '{profile_name}' {axis} lookup table has too many points (maximum {max_points})"
        ));
    }

    let mut previous_x = 0.0;
    for (index, point) in points.iter().enumerate() {
        if !point.x.is_finite() || !point.y.is_finite() {
            return Err(format!(
                "Profile '{profile_name}' {axis} lookup point {} must contain finite numbers",
                index + 1
            ));
        }
        if point.x <= 0.0 {
            return Err(format!(
                "Profile '{profile_name}' {axis} lookup point {} must have an input speed above zero",
                index + 1
            ));
        }
        if index > 0 && point.x <= previous_x {
            return Err(format!(
                "Profile '{profile_name}' {axis} lookup input speeds must be strictly increasing"
            ));
        }
        previous_x = point.x;
    }

    Ok(())
}

#[derive(Serialize, Deserialize, Clone, Debug, Default)]
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

fn default_poll_time_lock() -> bool {
    false
}

#[derive(Serialize, Deserialize, Clone, Debug, Default)]
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
    pub lookup_table: Vec<AppVec2D>,
}

impl AppProfile {
    pub fn to_native(&self) -> models::profile {
        let mut prof = models::profile::default();

        let mut name_u16 = [0u16; models::MAX_NAME_LEN];
        for (i, c) in self
            .name
            .encode_utf16()
            .enumerate()
            .take(models::MAX_NAME_LEN - 1)
        {
            name_u16[i] = c;
        }
        prof.name = name_u16;

        prof.accel_x = self.accel_x.to_native();
        prof.accel_y = self.accel_y.to_native();
        prof.degrees_rotation = self.degrees_rotation;
        prof.degrees_snap = self.degrees_snap;
        prof.speed_min = self.speed_min;
        prof.speed_max = self.speed_max;
        prof.lr_output_dpi_ratio = if self.lr_output_dpi_ratio <= 0.0 {
            1.0
        } else {
            self.lr_output_dpi_ratio
        };
        prof.ud_output_dpi_ratio = if self.ud_output_dpi_ratio <= 0.0 {
            1.0
        } else {
            self.ud_output_dpi_ratio
        };
        prof.output_dpi = if self.output_dpi <= 0.0 {
            1000.0
        } else {
            self.output_dpi
        };
        prof.yx_output_dpi_ratio = if self.yx_output_dpi_ratio <= 0.0 {
            1.0
        } else {
            self.yx_output_dpi_ratio
        };
        prof.range_weights = models::vec2d {
            x: if self.range_weights.x < 0.0 {
                1.0
            } else {
                self.range_weights.x
            },
            y: if self.range_weights.y < 0.0 {
                1.0
            } else {
                self.range_weights.y
            },
        };
        prof.domain_weights = models::vec2d {
            x: if self.domain_weights.x <= 0.0 {
                1.0
            } else {
                self.domain_weights.x
            },
            y: if self.domain_weights.y <= 0.0 {
                1.0
            } else {
                self.domain_weights.y
            },
        };

        prof.speed_processor_args = models::speed_args {
            whole: self.speed_processor_args.whole,
            lp_norm: if self.speed_processor_args.lp_norm <= 0.0 {
                2.0
            } else {
                self.speed_processor_args.lp_norm
            },
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
        args.acceleration = if self.acceleration <= 0.0 {
            0.001
        } else {
            self.acceleration
        };
        args.decay_rate = if self.decay_rate <= 0.0 {
            0.1
        } else {
            self.decay_rate
        };
        args.gamma = if self.gamma <= 0.0 { 1.0 } else { self.gamma };
        args.motivity = if self.motivity <= 1.0 {
            1.5
        } else {
            self.motivity
        };
        args.exponent_classic = if self.mode.as_str() == "linear" {
            2.0
        } else if self.exponent_classic <= 1.0 {
            2.0
        } else {
            self.exponent_classic
        };
        args.scale = if self.scale <= 0.0 { 1.0 } else { self.scale };
        args.exponent_power = if self.exponent_power <= 0.0 {
            0.05
        } else {
            self.exponent_power
        };
        args.limit = if self.limit <= 0.0 { 2.0 } else { self.limit };
        args.sync_speed = if self.sync_speed <= 0.0 {
            5.0
        } else {
            self.sync_speed
        };
        args.smooth = if self.smooth < 0.0 || self.smooth > 1.0 {
            0.0
        } else {
            self.smooth
        };
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
        args.cap = models::vec2d {
            x: self.cap.x,
            y: self.cap.y,
        };
        args.cap_mode = match self.cap_mode.as_str() {
            "in" => models::cap_mode::in_,
            "io" => models::cap_mode::io,
            _ => models::cap_mode::out,
        };

        let max_points = models::LUT_RAW_DATA_CAPACITY / 2;
        let num_points = std::cmp::min(self.lookup_table.len(), max_points);

        // `length` is the number of raw f32 values, not the number of points.
        // The C++ lookup implementation derives point count with `length / 2`.
        args.length = (num_points * 2) as i32;
        for i in 0..num_points {
            args.data[i * 2] = self.lookup_table[i].x as f32;
            args.data[i * 2 + 1] = self.lookup_table[i].y as f32;
        }

        args
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn lookup_points_are_written_as_driver_pairs() {
        let args = AppAccelArgs {
            mode: "lookup".to_string(),
            gain: true,
            lookup_table: vec![AppVec2D { x: 1.0, y: 2.0 }, AppVec2D { x: 4.0, y: 8.0 }],
            ..Default::default()
        };

        let native = args.to_native();
        assert_eq!(native.length, 4);
        assert_eq!(native.data[..4], [1.0, 2.0, 4.0, 8.0]);
        assert!(native.gain);
    }

    #[test]
    fn lookup_validation_rejects_duplicate_input_speeds() {
        let args = AppAccelArgs {
            mode: "lookup".to_string(),
            lookup_table: vec![AppVec2D { x: 1.0, y: 1.0 }, AppVec2D { x: 1.0, y: 2.0 }],
            ..Default::default()
        };

        assert!(validate_lookup_table("test", "X", &args).is_err());
    }

    #[test]
    fn profile_validation_rejects_empty_profiles() {
        let config = AppConfig {
            profiles: vec![],
            devices: vec![],
        };
        assert!(config.validate().is_err());
    }

    #[test]
    fn profile_validation_rejects_duplicate_names() {
        let config = AppConfig {
            profiles: vec![
                AppProfile {
                    name: "Gaming".to_string(),
                    ..Default::default()
                },
                AppProfile {
                    name: "gaming".to_string(),
                    ..Default::default()
                },
            ],
            devices: vec![],
        };
        assert!(config.validate().is_err());
    }

    #[test]
    fn profile_validation_rejects_invalid_device_mapping() {
        let config = AppConfig {
            profiles: vec![AppProfile {
                name: "Gaming".to_string(),
                ..Default::default()
            }],
            devices: vec![AppDeviceConfig {
                id: "DEV123".to_string(),
                profile_id: Some("NonExistent".to_string()),
                ..Default::default()
            }],
        };
        assert!(config.validate().is_err());
    }

    #[test]
    fn profile_validation_accepts_valid_multi_profile_mapping() {
        let config = AppConfig {
            profiles: vec![
                AppProfile {
                    name: "Gaming".to_string(),
                    ..Default::default()
                },
                AppProfile {
                    name: "Desktop".to_string(),
                    ..Default::default()
                },
            ],
            devices: vec![
                AppDeviceConfig {
                    id: "DEV_MOUSE1".to_string(),
                    profile_id: Some("Gaming".to_string()),
                    ..Default::default()
                },
                AppDeviceConfig {
                    id: "DEV_MOUSE2".to_string(),
                    profile_id: Some("Desktop".to_string()),
                    ..Default::default()
                },
                AppDeviceConfig {
                    id: "DEV_TRACKPAD".to_string(),
                    profile_id: None,
                    disable: true,
                    ..Default::default()
                },
            ],
        };
        assert!(config.validate().is_ok());
    }
}
