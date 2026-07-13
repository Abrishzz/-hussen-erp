import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/store/authStore'
import { useSettingsStore } from '@/store/settingsStore'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Languages, Moon, Sun, User } from 'lucide-react'

export function Navbar() {
  const { t, i18n } = useTranslation()
  const { user } = useAuthStore()
  const { settings, updateSettings } = useSettingsStore()

  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'am' : 'en'
    i18n.changeLanguage(newLang)
    updateSettings({ defaultLanguage: newLang as 'en' | 'am' })
  }

  const toggleDarkMode = () => {
    const newDark = !settings.darkMode
    updateSettings({ darkMode: newDark })
    if (newDark) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }

  const initials = user?.email?.charAt(0).toUpperCase() || 'U'

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 lg:px-6">
      <div className="flex-1" />

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={toggleLanguage} title={t('settings.language')}>
          <Languages className="h-5 w-5" />
        </Button>

        <Button variant="ghost" size="icon" onClick={toggleDarkMode} title={t('settings.darkMode')}>
          {settings.darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-8 w-8 rounded-full">
              <Avatar className="h-8 w-8">
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem disabled>
              <User className="mr-2 h-4 w-4" />
              {user?.email}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
