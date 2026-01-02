import { invoke } from '@tauri-apps/api/core'

export interface SystemInfo {
  os_name: string
  os_version: string
  hostname: string
  total_memory: number
  device_id: string
}

export async function getSystemInfo(): Promise<SystemInfo> {
  try {
    return await invoke<SystemInfo>('get_system_info')
  } catch (error) {
    console.error('Failed to get system info:', error)
    // Return mock data for web dev mode
    return {
      os_name: 'Windows (Mock)',
      os_version: '11.0 (Mock)',
      hostname: 'Dev-Machine',
      total_memory: 16 * 1024 * 1024 * 1024, // 16GB
      device_id: 'mock-device-id-for-dev'
    }
  }
}

export async function getDeviceId(): Promise<string> {
  try {
    return await invoke<string>('get_device_id')
  } catch (error) {
    console.error('Failed to get device id:', error)
    return 'unknown-device-id'
  }
}

export async function getDeviceName(): Promise<string> {
  try {
    return await invoke<string>('get_device_name')
  } catch (error) {
    console.error('Failed to get device name:', error)
    return 'Unknown Device'
  }
}

export async function setDeviceName(name: string): Promise<boolean> {
  try {
    return await invoke<boolean>('set_device_name', { name })
  } catch (error) {
    console.error('Failed to set device name:', error)
    return false
  }
}

export interface AppSettings {
  launch_on_startup: boolean
  desktop_notifications: boolean
  auto_sync_enabled: boolean
}

export async function getAppSettings(): Promise<AppSettings> {
  try {
    return await invoke<AppSettings>('get_app_settings')
  } catch (error) {
    console.error('Failed to get app settings:', error)
    return {
      launch_on_startup: true,
      desktop_notifications: false,
      auto_sync_enabled: true
    }
  }
}

export async function saveAppSettings(settings: AppSettings): Promise<boolean> {
  try {
    return await invoke<boolean>('save_app_settings', { settings })
  } catch (error) {
    console.error('Failed to save app settings:', error)
    return false
  }
}
