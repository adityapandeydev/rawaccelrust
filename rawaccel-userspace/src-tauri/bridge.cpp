#include "../../common/rawaccel-io-def.h"
#include "../../common/rawaccel.hpp"

extern "C" {
    void bridge_init_data(rawaccel::modifier_settings* settings) {
        rawaccel::init_data(*settings);
    }
}
