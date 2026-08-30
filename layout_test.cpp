#include <iostream>
#include <cstddef>

namespace rawaccel {
    enum class accel_mode {
        classic,
        jump,
        natural,
        synchronous,
        power,
        lookup,
        noaccel
    };

    enum class cap_mode {
        io,
        in,
        out
    };

    struct vec2d {
        double x;
        double y;
    };

    struct accel_args {
        accel_mode mode = accel_mode::noaccel;
        bool gain = 1;

        double input_offset = 0;
        double output_offset = 0;
        double acceleration = 0.005;
        double decay_rate = 0.1;
        double gamma = 1;
        double motivity = 1.5;
        double exponent_classic = 2;
        double scale = 1;
        double exponent_power = 0.05;
        double limit = 1.5;
        double sync_speed = 5;
        double smooth = 0.5;

        vec2d cap = { 15, 1.5 };
        cap_mode cap_mode = cap_mode::out;

        int length = 0;
        mutable float data[514] = {};
    };

    struct speed_args {
        bool whole = 1;
        double lp_norm = 2;
        double input_speed_smooth_halflife = 0;
        double scale_smooth_halflife = 0;
        double output_speed_smooth_halflife = 0;
    };

    struct profile {
        wchar_t name[256] = L"default";

        vec2d domain_weights = { 1, 1 };
        vec2d range_weights = { 1, 1 };

        accel_args accel_x;
        accel_args accel_y;
        speed_args speed_processor_args;

        double output_dpi = 1000;
        double yx_output_dpi_ratio = 1;
        double lr_output_dpi_ratio = 1;
        double ud_output_dpi_ratio = 1;

        double degrees_rotation = 0;

        double degrees_snap = 0;

        double speed_min = 0;
        double speed_max = 0;
    };
}

int main() {
    using namespace rawaccel;
    std::cout << "accel_args size: " << sizeof(accel_args) << "\n";
    std::cout << "mode: " << offsetof(accel_args, mode) << "\n";
    std::cout << "gain: " << offsetof(accel_args, gain) << "\n";
    std::cout << "input_offset: " << offsetof(accel_args, input_offset) << "\n";
    std::cout << "cap: " << offsetof(accel_args, cap) << "\n";
    std::cout << "cap_mode: " << offsetof(accel_args, cap_mode) << "\n";
    std::cout << "length: " << offsetof(accel_args, length) << "\n";
    std::cout << "data: " << offsetof(accel_args, data) << "\n";
    
    std::cout << "\nprofile size: " << sizeof(profile) << "\n";
    std::cout << "name: " << offsetof(profile, name) << "\n";
    std::cout << "domain_weights: " << offsetof(profile, domain_weights) << "\n";
    std::cout << "range_weights: " << offsetof(profile, range_weights) << "\n";
    std::cout << "accel_x: " << offsetof(profile, accel_x) << "\n";
    std::cout << "accel_y: " << offsetof(profile, accel_y) << "\n";
    std::cout << "speed_processor_args: " << offsetof(profile, speed_processor_args) << "\n";
    std::cout << "output_dpi: " << offsetof(profile, output_dpi) << "\n";
    std::cout << "yx_output_dpi_ratio: " << offsetof(profile, yx_output_dpi_ratio) << "\n";
    std::cout << "degrees_rotation: " << offsetof(profile, degrees_rotation) << "\n";
    return 0;
}
