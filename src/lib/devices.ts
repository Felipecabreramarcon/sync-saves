import { supabase } from './supabase'
import { getSystemInfo, getDeviceId } from './tauri'
import type { Device as DbDevice } from '@/types/database'

export interface Device extends DbDevice {
  is_current?: boolean
}

/**
 * Register or update current device in Supabase
 */
export async function registerCurrentDevice(userId: string): Promise<Device | null> {
  try {
    const sysInfo = await getSystemInfo()
    const deviceId = sysInfo.device_id
    
    // Determine OS
    let os: 'windows' | 'linux' | 'macos' = 'windows'
    const osName = sysInfo.os_name.toLowerCase()
    if (osName.includes('linux')) os = 'linux'
    else if (osName.includes('mac') || osName.includes('darwin')) os = 'macos'
    
    // Use upsert to handle both insert and update atomically
    // We assume there is a UNIQUE constraint on (user_id, machine_id) or just machine_id depending on schema.
    // Based on review, it should be machine_id + user_id.
    const { data, error } = await (supabase as any)
      .from('devices')
      .upsert(
        {
          user_id: userId,
          machine_id: deviceId,
          name: sysInfo.hostname,
          os,
          last_seen_at: new Date().toISOString()
        },
        { 
          onConflict: 'user_id,machine_id',
          ignoreDuplicates: false 
        }
      )
      .select()
      .single()
    
    if (error) {
      console.error('Error registering device:', error)
      return null
    }
    
    return { ...(data as Device), is_current: true }
  } catch (error) {
    console.error('Failed to register device:', error)
    return null
  }
}

/**
 * Get all devices for a user
 */
export async function getUserDevices(userId: string): Promise<Device[]> {
  try {
    const currentDeviceId = await getDeviceId()
    
    const { data, error } = await (supabase as any)
      .from('devices')
      .select('*')
      .eq('user_id', userId)
      .order('last_seen_at', { ascending: false })
    
    if (error) {
      console.error('Error fetching devices:', error)
      return []
    }
    
    // Mark current device
    return ((data as any[]) || []).map(device => ({
      ...device,
      is_current: device.machine_id === currentDeviceId
    })) as Device[]
  } catch (error) {
    console.error('Failed to get devices:', error)
    return []
  }
}

/**
 * Rename a device
 */
export async function renameDevice(deviceId: string, newName: string): Promise<boolean> {
  try {
    const { error } = await (supabase as any)
      .from('devices')
      .update({ name: newName })
      .eq('id', deviceId)
    
    if (error) {
      console.error('Error renaming device:', error)
      return false
    }
    
    return true
  } catch (error) {
    console.error('Failed to rename device:', error)
    return false
  }
}

/**
 * Remove a device
 */
export async function removeDevice(deviceId: string): Promise<boolean> {
  try {
    const { error } = await (supabase as any)
      .from('devices')
      .delete()
      .eq('id', deviceId)
    
    if (error) {
      console.error('Error removing device:', error)
      return false
    }
    
    return true
  } catch (error) {
    console.error('Failed to remove device:', error)
    return false
  }
}

/**
 * Get relative time string
 */
export function getRelativeTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)
  
  if (seconds < 60) return 'Just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`
  return `${Math.floor(seconds / 604800)}w ago`
}
