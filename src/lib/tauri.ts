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
