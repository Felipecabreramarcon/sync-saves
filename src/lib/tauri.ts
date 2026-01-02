import { invoke } from '@tauri-apps/api/core'

export interface SystemInfo {
  os_name: string
  os_version: string
  hostname: string
  total_memory: number
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
      total_memory: 16 * 1024 * 1024 * 1024 // 16GB
    }
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
