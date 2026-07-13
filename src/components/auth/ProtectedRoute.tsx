import { Navigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ShieldAlert } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import type { UserRole } from '@/types'

interface ProtectedRouteProps {
  children: React.ReactNode
  allowedRoles?: UserRole[]
}

/** The default landing route each role is guaranteed to have access to. */
export function roleHome(role: UserRole | null): string {
  switch (role) {
    case 'owner':
      return '/dashboard'
    case 'cashier':
      return '/pos'
    case 'staff':
      return '/inventory'
    default:
      return '/login'
  }
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, role, loading } = useAuth()
  const location = useLocation()
  const { t } = useTranslation()

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (allowedRoles && role && !allowedRoles.includes(role)) {
    const home = roleHome(role)
    // Guard against redirecting to the same route (would loop forever).
    if (location.pathname === home) {
      return (
        <div className="flex h-[60vh] flex-col items-center justify-center gap-3 text-center">
          <ShieldAlert className="h-12 w-12 text-destructive" />
          <h2 className="text-xl font-semibold">{t('errors.accessDenied')}</h2>
          <p className="text-muted-foreground">{t('errors.accessDeniedDesc')}</p>
        </div>
      )
    }
    return <Navigate to={home} replace />
  }

  return <>{children}</>
}
