import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Bell, AlertTriangle, Info, PackageX, CheckCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { useNotifications, type NotificationSeverity } from '@/hooks/useNotifications'

const SEVERITY_ICON: Record<NotificationSeverity, React.ElementType> = {
  danger: PackageX,
  warning: AlertTriangle,
  info: Info,
}

const SEVERITY_STYLE: Record<NotificationSeverity, string> = {
  danger: 'bg-destructive/10 text-destructive',
  warning: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400',
  info: 'bg-primary/10 text-primary',
}

export function NotificationBell() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const notifications = useNotifications()
  const count = notifications.length

  const go = (path: string) => {
    setOpen(false)
    navigate(path)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative rounded-full"
          aria-label={t('settings.notifications')}
        >
          <Bell className="h-5 w-5" />
          {count > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold leading-none text-destructive-foreground">
              {count > 9 ? '9+' : count}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="border-b px-4 py-3">
          <p className="text-sm font-semibold">{t('settings.notifications')}</p>
        </div>

        {count === 0 ? (
          <div className="flex flex-col items-center gap-2 px-4 py-8 text-center text-muted-foreground">
            <CheckCheck className="h-8 w-8 text-green-500" />
            <p className="text-sm">{t('notifications.allClear')}</p>
          </div>
        ) : (
          <ul className="max-h-96 overflow-y-auto py-1">
            {notifications.map((n) => {
              const Icon = SEVERITY_ICON[n.severity]
              return (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => go(n.path)}
                    className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-accent"
                  >
                    <span className={cn('mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', SEVERITY_STYLE[n.severity])}>
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium leading-tight">{n.title}</span>
                      <span className="block truncate text-xs text-muted-foreground">{n.description}</span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  )
}
