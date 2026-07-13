import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AppSettings } from '@/types'

interface SettingsState {
  settings: AppSettings
  setSettings: (settings: AppSettings) => void
  updateSettings: (partial: Partial<AppSettings>) => void
}

const defaultSettings: AppSettings = {
  shopName: 'Hussen Bakery',
  shopName_am: 'የሁሴን ዳቦ ቤት',
  logo: '',
  taxRate: 0,
  defaultLanguage: 'en',
  darkMode: false,
  currency: 'ETB',
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      settings: defaultSettings,
      setSettings: (settings) => set({ settings }),
      updateSettings: (partial) =>
        set((state) => ({
          settings: { ...state.settings, ...partial },
        })),
    }),
    {
      name: 'hussen-settings',
    }
  )
)
