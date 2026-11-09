// Offline oracle using the actual common/ constructors and curve operators.
// Reads test records on stdin; never opens a driver or writes application settings.
#include "math-vec2.hpp"
#include <cmath>
#include <cstdint>
#include <cstring>
#include <iomanip>
#include <iostream>
#include <string>
#include <vector>
#include "accel-union.hpp"
namespace ra = rawaccel;

void number(double value) {
    if (std::isnan(value)) std::cout << "\"NaN\"";
    else if (!std::isfinite(value)) std::cout << (value > 0 ? "\"Infinity\"" : "\"-Infinity\"");
    else std::cout << value;
}

int main() {
    std::cout << std::setprecision(17);
    int mode, gain, subtype, cap;
    while (std::cin >> mode >> gain >> subtype >> cap) {
        ra::accel_args a{};
        a.mode = static_cast<ra::accel_mode>(mode); a.gain = gain != 0;
        a.t_type = static_cast<ra::tiered_type>(subtype);
        a.cap_mode = static_cast<ra::cap_mode>(cap);
        std::string key;
        while (std::cin >> key && key != "points") {
            double value; if (!(std::cin >> value)) return 2;
#define FIELD(name) if (key == #name) a.name = value;
            FIELD(input_offset) FIELD(output_offset) FIELD(acceleration)
            FIELD(decay_rate) FIELD(gamma) FIELD(motivity) FIELD(exponent_classic)
            FIELD(scale) FIELD(exponent_power) FIELD(limit) FIELD(sync_speed) FIELD(smooth)
            FIELD(tiered_multiplier1) FIELD(tiered_input_offset1) FIELD(tiered_multiplier2)
            FIELD(tiered_transition1) FIELD(tiered_input_offset2) FIELD(tiered_multiplier3)
            FIELD(tiered_transition2) FIELD(tiered_decay_rate1) FIELD(tiered_decay_rate2)
#undef FIELD
            if (key == "cap_x") a.cap.x = value;
            if (key == "cap_y") a.cap.y = value;
        }
        int points; std::cin >> points;
        if (points < 0 || points > ra::LUT_POINTS_CAPACITY) return 3;
        a.length = points * 2;
        for (int i = 0; i < a.length; ++i) { double value; std::cin >> value; a.data[i] = static_cast<float>(value); }
        int count; std::cin >> count;
        if (count < 0 || count > 100000) return 4;
        std::vector<double> xs(count);
        for (auto& x : xs) std::cin >> x;
        if (!std::cin) return 5;
        ra::accel_union curve{};
        curve.init(a);
        std::cout << "{\"expected\":[";
        for (size_t i = 0; i < xs.size(); ++i) {
            if (i) std::cout << ',';
            number(curve.visit([&](auto& impl) { return impl(xs[i], a); }, a));
        }
        std::cout << "],\"table_bits\":[";
        if (a.mode == ra::accel_mode::synchronous && a.gain) {
            for (int i = 0; i < 97; ++i) {
                if (i) std::cout << ',';
                uint32_t bits; std::memcpy(&bits, &a.data[i], sizeof(bits));
                std::cout << bits;
            }
        }
        std::cout << "]}\n";
    }
}
