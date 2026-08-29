#pragma once

#include "rawaccel-base.hpp"
#include "utility.hpp"

namespace rawaccel {

    struct tiered_base {
        static double evaluate(double x, const accel_args& args)
        {
            if (x <= 0) return args.speed1;
            
            if (x < args.mid_cap) {
                double denom = args.mid_cap;
                if (denom <= 0) return args.speed2;
                double t = x / denom;
                return args.speed1 + t * (args.speed2 - args.speed1);
            }
            
            if (x < args.final_cap) {
                double denom = args.final_cap - args.mid_cap;
                if (denom <= 0) return args.speed4;
                double t = (x - args.mid_cap) / denom;
                return args.speed3 + t * (args.speed4 - args.speed3);
            }

            return args.speed4;
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
