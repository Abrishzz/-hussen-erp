import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Factory,
  Users,
  Wallet,
  BarChart3,
  Settings,
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import type { UserRole } from '@/types'

interface TabItem {
  label: string
  path: string
  icon: React.ElementType
  roles: UserRole[]
}

const tabItems: TabItem[] = [
  { label: 'nav.dashboard', path: '/dashboard', icon: LayoutDashboard, roles: ['owner'] },
  { label: 'nav.pos', path: '/pos', icon: ShoppingCart, roles: ['owner', 'cashier'] },
  { label: 'nav.inventory', path: '/inventory', icon: Package, roles: ['owner', 'staff'] },
  { label: 'nav.production', path: '/production', icon: Factory, roles: ['owner', 'staff'] },
  { label: 'nav.hr', path: '/hr', icon: Users, roles: ['owner'] },
  { label: 'nav.finance', path: '/finance', icon: Wallet, roles: ['owner'] },
  { label: 'nav.reports', path: '/reports', icon: BarChart3, roles: ['owner'] },
  { label: 'nav.settings', path: '/settings', icon: Settings, roles: ['owner'] },
]

export function BottomTabBar() {
  const { t } = useTranslation()
  const location = useLocation()
  const { role } = useAuthStore()

  const filteredTabs = tabItems.filter((tab) => role && tab.roles.includes(role))

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background lg:hidden">
      <div className="flex overflow-x-auto">
        {filteredTabs.map((tab) => (
          <Link
            key={tab.path}
            to={tab.path}
            className={cn(
              'flex min-w-0 flex-1 flex-col items-center gap-1 px-2 py-2 text-xs font-medium transition-colors',
              location.pathname === tab.path
                ? 'text-primary'
                : 'text-muted-foreground'
            )}
          >
            <tab.icon className="h-5 w-5" />
            <span className="truncate">{t(tab.label)}</span>
          </Link>
        ))}
      </div>
    </nav>
  )
}
