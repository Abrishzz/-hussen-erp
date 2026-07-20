import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useNotifications, type NotificationSeverity } from '@/hooks/useNotifications'
import { ErrorBoundary } from '@/components/ui/error-boundary'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Bell, AlertTriangle, Info, PackageX, CheckCheck, ChevronRight } from 'lucide-react'

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

export default function Notifications() {
  return <ErrorBoundary><NotificationsContent /></ErrorBoundary>
}

function NotificationsContent() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const notifications = useNotifications()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <Bell className="h-6 w-6 text-primary" /> {t('settings.notifications')}
        </h1>
        <p className="text-muted-foreground">{t('notifications.pageSubtitle')}</p>
      </div>

      {notifications.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <CheckCheck className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
            <p className="text-muted-foreground">{t('notifications.allClear')}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => {
            const Icon = SEVERITY_ICON[n.severity]
            return (
              <Card key={n.id}>
                <CardContent className="p-0">
                  <button
                    onClick={() => navigate(n.path)}
                    className="flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-accent"
                  >
                    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${SEVERITY_STYLE[n.severity]}`}>
                      <Icon className="h-5 w-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold">{n.title}</p>
                      {n.description && (
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">{n.description}</p>
                      )}
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </button>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <Button variant="outline" onClick={() => navigate(-1)}>{t('common.back')}</Button>
    </div>
  )
}
