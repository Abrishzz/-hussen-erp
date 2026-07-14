import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/store/authStore'
import { useSettingsStore } from '@/store/settingsStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Languages, Moon, Sun, Search, Bell } from 'lucide-react'

export function Navbar() {
  const { t, i18n } = useTranslation()
  const { user, role } = useAuthStore()
  const { settings, updateSettings } = useSettingsStore()

  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'am' : 'en'
    i18n.changeLanguage(newLang)
    updateSettings({ defaultLanguage: newLang as 'en' | 'am' })
  }

  const toggleDarkMode = () => {
    const newDark = !settings.darkMode
    updateSettings({ darkMode: newDark })
    document.documentElement.classList.toggle('dark', newDark)
  }

  const name = user?.displayName || user?.email?.split('@')[0] || 'User'
  const initials = name.charAt(0).toUpperCase()

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border/60 bg-background/80 px-4 backdrop-blur lg:px-6">
      <div className="relative hidden max-w-sm flex-1 sm:block">
        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder={t('common.search')} className="h-10 rounded-full border-transparent bg-secondary pl-10" />
      </div>

      <div className="flex flex-1 items-center justify-end gap-1.5">
        <Button variant="ghost" size="icon" className="rounded-full" onClick={toggleLanguage} title={t('settings.language')}>
          <Languages className="h-5 w-5" />
        </Button>
        <Button variant="ghost" size="icon" className="rounded-full" onClick={toggleDarkMode} title={t('settings.darkMode')}>
          {settings.darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </Button>
        <Button variant="ghost" size="icon" className="relative rounded-full" title={t('settings.notifications')}>
          <Bell className="h-5 w-5" />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-primary" />
        </Button>

        <div className="ml-1 flex items-center gap-3 rounded-full border border-border/60 bg-card py-1 pl-1 pr-3">
          <Avatar className="h-9 w-9">
            <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-violet-600 text-sm font-semibold text-white">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="hidden leading-tight sm:block">
            <p className="max-w-[10rem] truncate text-sm font-semibold capitalize">{name}</p>
            <p className="text-xs text-muted-foreground">{role ? t(`auth.roles.${role}`) : ''}</p>
          </div>
        </div>
      </div>
    </header>
  )
}
