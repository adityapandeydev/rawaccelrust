#pragma once

#include "rawaccel-base.hpp"
#include "utility.hpp"

namespace rawaccel {

    /// <summary> Struct to hold "tiered" (three-level) acceleration implementation. </summary>
    /// <remarks>
    /// Linear blends between three sensitivity levels across two transitions.
    /// Natural approaches each next level with a natural-style exponential decay.
    /// The constants are computed from accel_args here, in the same order as
    /// userspace computes them, so C++ and userspace produce identical packets.
    /// </remarks>
    struct tiered_base {
        union {
            struct {
                double m1;
                double x1;
                double m2;
                double x1_end;
                double inv_trans1;
                double m3;
                double x2;
                double x2_end;
                double inv_trans2;
            } linear;
            struct {
                double m1;
                double x1;
                double l1;
                double a1;
                double x2;
                double v2;
                double m2_prime;
                double l2;
                double a2;
            } natural;
        };

        tiered_base(const accel_args& args, bool gain)
        {
            if (args.t_type == tiered_type::linear) {
                init_linear(args);
            }
            else {
                init_natural(args, gain);
            }
        }

        void init_linear(const accel_args& args)
        {
            linear.m1 = args.tiered_multiplier1;
            linear.x1 = args.tiered_input_offset1;
            linear.m2 = args.tiered_multiplier2;
            linear.x1_end = args.tiered_input_offset1 + args.tiered_transition1;
            linear.inv_trans1 = args.tiered_transition1 > 0 ? 1 / args.tiered_transition1 : 0;
            linear.m3 = args.tiered_multiplier3;
            linear.x2 = args.tiered_input_offset2;
            linear.x2_end = args.tiered_input_offset2 + args.tiered_transition2;
            linear.inv_trans2 = args.tiered_transition2 > 0 ? 1 / args.tiered_transition2 : 0;
        }

        void init_natural(const accel_args& args, bool gain)
        {
            double m1 = args.tiered_multiplier1;
            double x1 = args.tiered_input_offset1;
            double v1 = m1 * x1;

            double l1 = args.tiered_multiplier2 - m1;
            double a1 = l1 != 0 ? args.tiered_decay_rate1 / fabs(l1) : 0;

            double x2 = args.tiered_input_offset2;
            double dx1 = x2 - x1;

            double v2 = v1 + m1 * dx1;
            double m2_prime = m1;

            if (l1 != 0) {
                double decay1 = exp(-a1 * dx1);

                if (gain) {
                    // Gain: the first stage's output is the integral of its gain.
                    v2 = v1 + m1 * dx1 + l1 * (dx1 - (1 - decay1) / a1);
                    m2_prime = m1 + l1 * (1 - decay1);
                }
                else {
                    // Legacy: the first stage's output is speed times its sensitivity.
                    v2 = v1 + m1 * dx1 + l1 * dx1 * (1 - decay1);
                    m2_prime = m1 + l1 * (1 - decay1 + dx1 * a1 * decay1);
                }
            }

            double l2 = args.tiered_multiplier3 - m2_prime;
            double a2 = l2 != 0 ? args.tiered_decay_rate2 / fabs(l2) : 0;

            natural.m1 = m1;
            natural.x1 = x1;
            natural.l1 = l1;
            natural.a1 = a1;
            natural.x2 = x2;
            natural.v2 = v2;
            natural.m2_prime = m2_prime;
            natural.l2 = l2;
            natural.a2 = a2;
        }

        double evaluate_linear(double x) const
        {
            if (x <= linear.x1) return linear.m1;

            if (x < linear.x1_end) {
                if (linear.inv_trans1 <= 0) return linear.m2;
                double t = (x - linear.x1) * linear.inv_trans1;
                return linear.m1 + t * (linear.m2 - linear.m1);
            }

            if (x <= linear.x2) return linear.m2;

            if (x < linear.x2_end) {
                if (linear.inv_trans2 <= 0) return linear.m3;
                double t = (x - linear.x2) * linear.inv_trans2;
                return linear.m2 + t * (linear.m3 - linear.m2);
            }

            return linear.m3;
        }
    };

    template <bool Gain> struct tiered;

    template<>
    struct tiered<LEGACY> : tiered_base {
        tiered(const accel_args& args) : tiered_base(args, LEGACY) {}

        double operator()(double x, const accel_args& args) const
        {
            if (args.t_type == tiered_type::linear) {
                return evaluate_linear(x);
            }

            // Tiered Natural LEGACY (Sensitivity matching standard Natural Gain OFF)
            if (x <= natural.x1) return natural.m1;

            if (x < natural.x2) {
                if (natural.l1 == 0) return natural.m1;
                double dx = x - natural.x1;
                double decay = exp(-natural.a1 * dx);
                double v = natural.m1 * natural.x1 + natural.m1 * dx + natural.l1 * dx * (1.0 - decay);
                return v / x;
            }

            if (natural.l2 == 0) {
                double dx2 = x - natural.x2;
                return (natural.v2 + natural.m2_prime * dx2) / x;
            }

            double dx2 = x - natural.x2;
            double decay2 = exp(-natural.a2 * dx2);
            double v = natural.v2 + natural.m2_prime * dx2 + natural.l2 * dx2 * (1.0 - decay2);
            return v / x;
        }
    };

    template<>
    struct tiered<GAIN> : tiered_base {
        tiered(const accel_args& args) : tiered_base(args, GAIN) {}

        double operator()(double x, const accel_args& args) const
        {
            if (args.t_type == tiered_type::linear) {
                // Linear has no separate gain form; it uses the same blend.
                return evaluate_linear(x);
            }

            // Tiered Natural GAIN integration (Matching standard Natural Gain ON)
            if (x <= natural.x1) return natural.m1;

            if (x < natural.x2) {
                if (natural.l1 == 0) return natural.m1;
                double dx = x - natural.x1;
                double decay = exp(-natural.a1 * dx);
                double v = natural.m1 * natural.x1 + natural.m1 * dx + natural.l1 * (dx - (1.0 - decay) / natural.a1);
                return v / x;
            }

            if (natural.l2 == 0) {
                double dx2 = x - natural.x2;
                return (natural.v2 + natural.m2_prime * dx2) / x;
            }

            double dx2 = x - natural.x2;
            double decay2 = exp(-natural.a2 * dx2);
            double v = natural.v2 + natural.m2_prime * dx2 + natural.l2 * (dx2 - (1.0 - decay2) / natural.a2);
            return v / x;
        }
    };

}
