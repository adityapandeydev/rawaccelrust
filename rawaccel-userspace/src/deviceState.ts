import type { Device, DeviceConfig } from './types';

// Zero numeric overrides inherit driver defaults. New devices stay unassigned.
export const defaultDeviceConfig = (id: string): DeviceConfig => ({
  id, profile_id: null, disable: false, set_extra_info: false,
  poll_time_lock: false, dpi: 0, polling_rate: 0, clamp_min: 0, clamp_max: 0,
});

// Settings for mice without their own entry. Zero values inherit the driver
// defaults, exactly as they do for a device entry.
export type DeviceDefaults = Omit<DeviceConfig, 'id' | 'profile_id'>;
export const BASE_DEVICE_DEFAULTS: DeviceDefaults = {
  disable: false, set_extra_info: false, poll_time_lock: false,
  dpi: 0, polling_rate: 0, clamp_min: 0, clamp_max: 0,
};

export function readDeviceDefaults(metadata: Record<string, unknown>): DeviceDefaults {
  const stored = metadata.default_device_config;
  return stored && typeof stored === 'object' && !Array.isArray(stored)
    ? { ...BASE_DEVICE_DEFAULTS, ...(stored as Partial<DeviceDefaults>) } : { ...BASE_DEVICE_DEFAULTS };
}

// The block is written on first edit only, so untouched documents are unchanged.
export function patchDeviceDefaults(metadata: Record<string, unknown>, patch: Partial<DeviceDefaults>) {
  return { ...metadata, default_device_config: { ...readDeviceDefaults(metadata), ...patch } };
}

export interface DeviceEntry { id: string; name: string; connected: boolean; config: DeviceConfig; }

// Connected mice in discovery order, then saved entries for disconnected mice.
export function deviceEntries(devices: Device[], config: DeviceConfig[]): DeviceEntry[] {
  const connected = devices.map(device => ({ id: device.id, name: device.name, connected: true,
    config: config.find(entry => entry.id === device.id) ?? defaultDeviceConfig(device.id) }));
  const saved = config.filter(entry => !devices.some(device => device.id === entry.id))
    .sort((a, b) => a.id.localeCompare(b.id))
    .map(entry => ({ id: entry.id, name: entry.id, connected: false, config: entry }));
  return [...connected, ...saved];
}

export function resolveDeviceSelection(id: string | null, devices: Device[]): string | null {
  return devices.some(device => device.id === id) ? id : devices[0]?.id ?? null;
}

export function patchDevice(config: DeviceConfig[], id: string, patch: Partial<DeviceConfig>): DeviceConfig[] {
  const exists = config.some(device => device.id === id);
  return exists
    ? config.map(device => device.id === id ? { ...device, ...patch, id } : device)
    : [...config, { ...defaultDeviceConfig(id), ...patch, id }];
}
