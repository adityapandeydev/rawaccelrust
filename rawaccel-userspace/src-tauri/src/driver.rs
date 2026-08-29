use std::ffi::c_void;
use std::mem::size_of;
use std::ptr;
use windows::core::{Error, HRESULT, PCWSTR};
use windows::Win32::Foundation::{CloseHandle, GENERIC_READ, GENERIC_WRITE, HANDLE};
use windows::Win32::Storage::FileSystem::{CreateFileW, FILE_SHARE_READ, FILE_SHARE_WRITE, OPEN_EXISTING, FILE_ATTRIBUTE_NORMAL};
use windows::Win32::System::IO::DeviceIoControl;
use windows::core::w;

// IOCTL Definitions matching rawaccel-io-def.h
const FILE_DEVICE_UNKNOWN: u32 = 0x22; // Not used directly, rawaccel uses 0x8888
const RAWACCEL_DEVICE_TYPE: u32 = 0x8888;
const METHOD_BUFFERED: u32 = 0;
const FILE_ANY_ACCESS: u32 = 0;

const fn ctl_code(device_type: u32, function: u32, method: u32, access: u32) -> u32 {
    (device_type << 16) | (access << 14) | (function << 2) | method
}

pub const IOCTL_READ: u32 = ctl_code(RAWACCEL_DEVICE_TYPE, 0x888, METHOD_BUFFERED, FILE_ANY_ACCESS);
pub const IOCTL_WRITE: u32 = ctl_code(RAWACCEL_DEVICE_TYPE, 0x889, METHOD_BUFFERED, FILE_ANY_ACCESS);
pub const IOCTL_GET_VERSION: u32 = ctl_code(RAWACCEL_DEVICE_TYPE, 0x88a, METHOD_BUFFERED, FILE_ANY_ACCESS);

pub struct DriverHandle(HANDLE);

impl DriverHandle {
    pub fn open() -> windows::core::Result<Self> {
        unsafe {
            let handle = CreateFileW(
                w!(r"\\.\rawaccel"),
                0, // FILE_ANY_ACCESS (0) is used in the C++ wrapper
                FILE_SHARE_READ | FILE_SHARE_WRITE,
                None,
                OPEN_EXISTING,
                FILE_ATTRIBUTE_NORMAL,
                HANDLE::default(),
            )?;

            if handle.is_invalid() {
                return Err(Error::from_hresult(HRESULT(-1))); // TODO: Proper error
            }

            Ok(Self(handle))
        }
    }

    pub fn get_version(&self) -> windows::core::Result<[u32; 4]> {
        let mut version: [u32; 4] = [0; 4];
        let mut bytes_returned = 0;
        
        unsafe {
            DeviceIoControl(
                self.0,
                IOCTL_GET_VERSION,
                None,
                0,
                Some(version.as_mut_ptr() as *mut c_void),
                (size_of::<u32>() * 4) as u32,
                Some(&mut bytes_returned),
                None,
            )?;
        }

        Ok(version)
    }
}

impl Drop for DriverHandle {
    fn drop(&mut self) {
        unsafe {
            let _ = CloseHandle(self.0);
        }
    }
}
