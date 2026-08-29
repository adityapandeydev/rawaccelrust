#include <iostream>
#include "rawaccel.hpp"

using namespace rawaccel;

#define DUMP_SIZE(type) std::cout << "sizeof(" #type ") = " << sizeof(type) << std::endl;
#define DUMP_OFFSET(type, field) std::cout << "offsetof(" #type ", " #field ") = " << offsetof(type, field) << std::endl;

int main() {
    DUMP_SIZE(accel_args)
    DUMP_OFFSET(accel_args, mode)
    DUMP_OFFSET(accel_args, gain)
    DUMP_OFFSET(accel_args, input_offset)
    DUMP_OFFSET(accel_args, cap)
    DUMP_OFFSET(accel_args, cap_mode)
    DUMP_OFFSET(accel_args, length)
    DUMP_OFFSET(accel_args, data)

    DUMP_SIZE(speed_args)
    DUMP_SIZE(profile)
    DUMP_OFFSET(profile, accel_x)

    DUMP_SIZE(device_settings)
    DUMP_SIZE(modifier_settings)
    DUMP_SIZE(io_base)

    return 0;
}
