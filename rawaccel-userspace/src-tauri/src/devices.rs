use serde::{Deserialize, Serialize};
use std::ffi::OsString;
use std::os::windows::ffi::OsStringExt;
use windows::core::PCWSTR;
use windows::Win32::Devices::DeviceAndDriverInstallation::{
    CM_Get_Device_Interface_PropertyW, CR_BUFFER_SMALL, CR_SUCCESS,
};
use windows::Win32::Devices::Properties::{DEVPKEY_Device_InstanceId, DEVPROPTYPE};
use windows::Win32::Devices::HumanInterfaceDevice::{
    HidD_GetManufacturerString, HidD_GetProductString,
};
use windows::Win32::Foundation::{CloseHandle, INVALID_HANDLE_VALUE};
use windows::Win32::Storage::FileSystem::{
    CreateFileW, FILE_SHARE_READ, FILE_SHARE_WRITE, OPEN_EXISTING, FILE_FLAGS_AND_ATTRIBUTES,
};
use windows::Win32::UI::Input::{
    GetRawInputDeviceInfoW, GetRawInputDeviceList, RAWINPUTDEVICELIST, RIDI_DEVICENAME,
    RIM_TYPEMOUSE,
};

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct DeviceInfo {
    pub name: String,
    pub id: String,
}

const HID_STR_MAX_LEN: usize = 127;

fn get_device_list() -> Option<Vec<RAWINPUTDEVICELIST>> {
    let mut num_devs = 0u32;
    let elem_size = std::mem::size_of::<RAWINPUTDEVICELIST>() as u32;

    unsafe {
        if GetRawInputDeviceList(None, &mut num_devs, elem_size) == 0 {
            let mut dev_list: Vec<RAWINPUTDEVICELIST> = Vec::with_capacity(num_devs as usize);
            let res = GetRawInputDeviceList(
                Some(dev_list.as_mut_ptr()),
                &mut num_devs,
                elem_size,
            );
            if res != u32::MAX {
                dev_list.set_len(num_devs as usize);
                return Some(dev_list);
            }
        }
    }
    None
}

pub fn get_connected_devices() -> Vec<DeviceInfo> {
    let mut devices = Vec::new();
    let dev_list = match get_device_list() {
        Some(list) => list,
        None => return devices,
    };

    for dev_list_entry in dev_list {
        if dev_list_entry.dwType != RIM_TYPEMOUSE {
            continue;
        }

        let handle = dev_list_entry.hDevice;

        let mut name_len = 0u32;
        unsafe {
            if GetRawInputDeviceInfoW(Some(handle), RIDI_DEVICENAME, None, &mut name_len) == u32::MAX {
                continue;
            }
        }

        let mut interface_name: Vec<u16> = vec![0; name_len as usize];
        unsafe {
            if GetRawInputDeviceInfoW(
                Some(handle),
                RIDI_DEVICENAME,
                Some(interface_name.as_mut_ptr() as *mut _),
                &mut name_len,
            ) == u32::MAX
            {
                continue;
            }
        }

        let mut name_str = String::new();
        unsafe {
            let hid_dev_object_res = CreateFileW(
                PCWSTR(interface_name.as_ptr()),
                0,
                FILE_SHARE_READ | FILE_SHARE_WRITE,
                None,
                OPEN_EXISTING,
                FILE_FLAGS_AND_ATTRIBUTES(0),
                None,
            );

            if let Ok(hid_dev_object) = hid_dev_object_res {
                if hid_dev_object != INVALID_HANDLE_VALUE {
                    let mut product_buf = [0u16; HID_STR_MAX_LEN];
                    if HidD_GetProductString(
                        hid_dev_object,
                        product_buf.as_mut_ptr() as *mut _,
                        (HID_STR_MAX_LEN * 2) as u32,
                    ) {
                        let product_sv = OsString::from_wide(&product_buf)
                            .to_string_lossy()
                            .trim_end_matches('\0')
                            .to_string();

                        let mut manufacturer_buf = [0u16; HID_STR_MAX_LEN];
                        if HidD_GetManufacturerString(
                            hid_dev_object,
                            manufacturer_buf.as_mut_ptr() as *mut _,
                            (HID_STR_MAX_LEN * 2) as u32,
                        ) {
                            let manufacturer_sv = OsString::from_wide(&manufacturer_buf)
                                .to_string_lossy()
                                .trim_end_matches('\0')
                                .to_string();

                            if product_sv.starts_with(&manufacturer_sv) {
                                name_str = product_sv;
                            } else {
                                name_str = format!("{} {}", manufacturer_sv, product_sv);
                            }
                        } else {
                            name_str = product_sv;
                        }
                    }
                    let _ = CloseHandle(hid_dev_object);
                }
            }
        }

        let mut id_size = 0u32;
        let mut prop_type = DEVPROPTYPE(0);
        unsafe {
            let cm_res = CM_Get_Device_Interface_PropertyW(
                PCWSTR(interface_name.as_ptr()),
                &DEVPKEY_Device_InstanceId,
                &mut prop_type,
                None,
                &mut id_size,
                0,
            );

            if cm_res != CR_BUFFER_SMALL && cm_res != CR_SUCCESS {
                continue;
            }

            let mut id_buf: Vec<u8> = vec![0; id_size as usize];
            let cm_res2 = CM_Get_Device_Interface_PropertyW(
                PCWSTR(interface_name.as_ptr()),
                &DEVPKEY_Device_InstanceId,
                &mut prop_type,
                Some(id_buf.as_mut_ptr()),
                &mut id_size,
                0,
            );

            if cm_res2 != CR_SUCCESS {
                continue;
            }

            let id_utf16: &[u16] = std::slice::from_raw_parts(
                id_buf.as_ptr() as *const u16,
                id_size as usize / 2,
            );
            
            let mut id_str = OsString::from_wide(id_utf16)
                .to_string_lossy()
                .trim_end_matches('\0')
                .to_string();

            if let Some(idx) = id_str.rfind('\\') {
                id_str = id_str[..idx].to_string();
            }
            
            if !devices.iter().any(|d: &DeviceInfo| d.id == id_str) {
                devices.push(DeviceInfo {
                    name: name_str,
                    id: id_str,
                });
            }
        }
    }

    devices
}
