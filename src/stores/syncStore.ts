import { create } from 'zustand'

interface SyncState {
  status: 'idle' | 'syncing' | 'error' | 'success'
  progress: number
  message: string
  isBackendConnected: boolean
  
  setStatus: (status: SyncState['status']) => void
  setProgress: (progress: number) => void
  setMessage: (message: string) => void
  setBackendConnected: (connected: boolean) => void
}

export const useSyncStore = create<SyncState>()((set) => ({
  status: 'idle',
  progress: 0,
  message: '',
  isBackendConnected: false,

  setStatus: (status) => set({ status }),
  setProgress: (progress) => set({ progress }),
  setMessage: (message) => set({ message }),
  setBackendConnected: (isBackendConnected) => set({ isBackendConnected }),
}))
