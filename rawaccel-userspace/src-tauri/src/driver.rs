use std::ffi::c_void;
use std::mem::size_of;
use std::ptr;
use windows::core::{Error, HRESULT, PCWSTR};
use windows::Win32::Foundation::{CloseHandle, GENERIC_READ, GENERIC_WRITE, HANDLE};
use windows::Win32::Storage::FileSystem::{CreateFileW, FILE_SHARE_READ, FILE_SHARE_WRITE, OPEN_EXISTING, FILE_ATTRIBUTE_NORMAL};
use windows::Win32::System::IO::DeviceIoControl;
use windows::Win32::Foundation::{HANDLE, GENERIC_READ, GENERIC_WRITE, CloseHandle};
use windows::Win32::Storage::FileSystem::{CreateFileW, OPEN_EXISTING};
use windows::core::PCWSTR;

use crate::models::root::ra;

const DEVICE_NAME: &str = r"\\.\rawaccel";

// IOCTLs from rawaccel-io-def.h
const IOCTL_READ: u32 = 0x22a000;
const IOCTL_WRITE: u32 = 0x226004;
const IOCTL_GET_VERSION: u32 = 0x22a008;

pub fn open_driver() -> Result<HANDLE, String> {
    let mut wide_name: Vec<u16> = DEVICE_NAME.encode_utf16().collect();
    wide_name.push(0);

    let handle = unsafe {
        CreateFileW(
            PCWSTR(wide_name.as_ptr()),
            GENERIC_READ.0 | GENERIC_WRITE.0,
            0,
            None,
            OPEN_EXISTING,
            0,
            None,
        )
    };

    if handle.is_invalid() {
        Err(format!("Failed to open driver. Is RawAccel installed and running?"))
    } else {
        Ok(handle)
    }
}

pub fn get_version() -> Result<(i32, i32, i32), String> {
    let handle = open_driver()?;
    let mut version = (0i32, 0i32, 0i32);
    let mut bytes_returned = 0u32;

    let success = unsafe {
        DeviceIoControl(
            handle,
            IOCTL_GET_VERSION,
            None,
            0,
            Some(&mut version as *mut _ as *mut _),
            size_of::<(i32, i32, i32)>() as u32,
            Some(&mut bytes_returned),
            None,
        )
    };

    unsafe { CloseHandle(handle); }

    if success.is_ok() && bytes_returned > 0 {
        Ok(version)
    } else {
        Err("Failed to get driver version".to_string())
    }
}

pub fn apply_config(config: &crate::config::AppConfig) -> Result<(), String> {
    let handle = open_driver()?;
    
    let num_profiles = config.profiles.len();
    // For now assume 1 device
    let num_devices = 1;
    
    let io_base_size = size_of::<ra::io_base>();
    let modifier_data_size = size_of::<ra::modifier_settings>() * num_profiles;
    let device_data_size = size_of::<ra::device_settings>() * num_devices;
    
    let total_size = io_base_size + modifier_data_size + device_data_size;
    
    let mut buffer = vec![0u8; total_size];
    
    unsafe {
        let base_ptr = buffer.as_mut_ptr() as *mut ra::io_base;
        
        // Initialize base
        (*base_ptr).modifier_data_size = num_profiles as u32;
        (*base_ptr).device_data_size = num_devices as u32;
        
        let mod_ptr = (buffer.as_mut_ptr().add(io_base_size)) as *mut ra::modifier_settings;
        for i in 0..num_profiles {
            let settings = &mut *mod_ptr.add(i);
            settings.prof = config.profiles[i].to_native();
            crate::models::bridge_init_data(settings);
        }
        
        let dev_ptr = (buffer.as_mut_ptr().add(io_base_size + modifier_data_size)) as *mut ra::device_settings;
        for i in 0..num_devices {
            let dev_settings = &mut *dev_ptr.add(i);
            // Default device init
            dev_settings.config = (*base_ptr).default_dev_cfg;
        }
        
        let mut bytes_returned = 0;
        let success = DeviceIoControl(
            handle,
            IOCTL_WRITE,
            Some(buffer.as_ptr() as *const _),
            total_size as u32,
            None,
            0,
            Some(&mut bytes_returned),
            None,
        );
        
        CloseHandle(handle).ok();
        
        if success.is_ok() {
            Ok(())
        } else {
            Err("Failed to write to driver via DeviceIoControl".to_string())
        }
    }
}
