#pragma once

#include "rawaccel-base.hpp"
#include "utility.hpp"

namespace rawaccel {

    struct tiered_base {
        static double evaluate(double x, const accel_args& args)
        {
            if (args.t_type == tiered_type::natural) {
                // Tiered Natural: Evaluates a multi-stage exponential decay curve.
                // Stage 1: Flat offset applying the initial multiplier.
                if (x <= args.tiered_input_offset1) return args.tiered_multiplier1;
                
                // Stage 2: Exponential decay towards the second multiplier target.
                // The decay is calculated relative to the distance from the first offset.
                if (x < args.tiered_input_offset2) {
                    double offset_x = args.tiered_input_offset1 - x;
                    double limit = args.tiered_multiplier2 - args.tiered_multiplier1;
                    if (limit == 0) return args.tiered_multiplier1;
                    double decay = exp((args.tiered_decay_rate1 / fabs(limit)) * offset_x);
                    return args.tiered_multiplier1 + limit * (1 - decay);
                }
                
                // Calculate the final value reached at the end of Stage 2 to ensure continuous transition into Stage 3.
                double y_at_mid = args.tiered_multiplier1;
                double offset_x_mid = args.tiered_input_offset1 - args.tiered_input_offset2;
                double limit1 = args.tiered_multiplier2 - args.tiered_multiplier1;
                if (limit1 != 0) {
                    double decay_mid = exp((args.tiered_decay_rate1 / fabs(limit1)) * offset_x_mid);
                    y_at_mid = args.tiered_multiplier1 + limit1 * (1 - decay_mid);
                }
                
                // Stage 3: Secondary exponential decay towards the third multiplier target.
                double offset_x2 = args.tiered_input_offset2 - x;
                double limit2 = args.tiered_multiplier3 - y_at_mid;
                if (limit2 == 0) return y_at_mid;
                double decay2 = exp((args.tiered_decay_rate2 / fabs(limit2)) * offset_x2);
                return y_at_mid + limit2 * (1 - decay2);
            } else {
                // Tiered Linear: Evaluates a piecewise linear interpolation curve spanning flat offsets and transitions.
                // Stage 1: Initial flat offset.
                if (x <= args.tiered_input_offset1) return args.tiered_multiplier1;
                
                // Stage 2: Linear transition from the initial multiplier to the second multiplier.
                if (x < args.tiered_transition1) {
                    double denom = args.tiered_transition1 - args.tiered_input_offset1;
                    if (denom <= 0) return args.tiered_multiplier2;
                    double t = (x - args.tiered_input_offset1) / denom;
                    return args.tiered_multiplier1 + t * (args.tiered_multiplier2 - args.tiered_multiplier1);
                }
                
                // Stage 3: Second flat offset maintaining the second multiplier.
                if (x <= args.tiered_input_offset2) return args.tiered_multiplier2;
                
                // Stage 4: Secondary linear transition towards the third multiplier.
                if (x < args.tiered_transition2) {
                    double denom = args.tiered_transition2 - args.tiered_input_offset2;
                    if (denom <= 0) return args.tiered_multiplier3;
                    double t = (x - args.tiered_input_offset2) / denom;
                    return args.tiered_multiplier2 + t * (args.tiered_multiplier3 - args.tiered_multiplier2);
                }
                
                // Stage 5: Final infinite flat region.
                return args.tiered_multiplier3;
            }
        }
    };

    template <bool Gain> struct tiered;

    template<>
    struct tiered<LEGACY> : tiered_base {
        tiered(const accel_args&) {}

        double operator()(double x, const accel_args& args) const
        {
            double y = evaluate(x, args);
            // In legacy mode for Tiered, we treat the curve as velocity (output speed)
            // So we divide by input speed to get the multiplier
            if (x > 0) return y / x;
            return y;
        }
    };

    template<>
    struct tiered<GAIN> : tiered_base {
        tiered(const accel_args&) {}

        double operator()(double x, const accel_args& args) const
        {
            double y = evaluate(x, args);
            // In gain mode, the curve directly represents the multiplier
            return y;
        }
    };

}
