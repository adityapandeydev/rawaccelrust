#pragma once

#include "rawaccel-base.hpp"
#include "utility.hpp"

namespace rawaccel {

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
        tiered(const accel_args&) {} // Handled by pre-computation in Rust.

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
        tiered(const accel_args&) {} // Handled by pre-computation in Rust.

        double operator()(double x, const accel_args& args) const
        {
            if (args.t_type == tiered_type::linear) {
                // Gain is disabled for Linear in the UI. 
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
