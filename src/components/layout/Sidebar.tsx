import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  ShoppingCart,
  Croissant,
  Package,
  Factory,
  Users,
  Wallet,
  BarChart3,
  Settings,
  LogOut,
  Store,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/useAuth'
import { useAuthStore } from '@/store/authStore'
import type { UserRole } from '@/types'

interface NavItem {
  label: string
  path: string
  icon: React.ElementType
  roles: UserRole[]
}

const navItems: NavItem[] = [
  { label: 'nav.dashboard', path: '/dashboard', icon: LayoutDashboard, roles: ['owner'] },
  { label: 'nav.pos', path: '/pos', icon: ShoppingCart, roles: ['owner', 'cashier'] },
  { label: 'nav.products', path: '/products', icon: Croissant, roles: ['owner'] },
  { label: 'nav.inventory', path: '/inventory', icon: Package, roles: ['owner', 'staff'] },
  { label: 'nav.production', path: '/production', icon: Factory, roles: ['owner', 'staff'] },
  { label: 'nav.hr', path: '/hr', icon: Users, roles: ['owner'] },
  { label: 'nav.finance', path: '/finance', icon: Wallet, roles: ['owner'] },
  { label: 'nav.reports', path: '/reports', icon: BarChart3, roles: ['owner'] },
  { label: 'nav.settings', path: '/settings', icon: Settings, roles: ['owner'] },
]

export function Sidebar() {
  const { t } = useTranslation()
  const location = useLocation()
  const { role } = useAuthStore()
  const { logout } = useAuth()

  const filteredItems = navItems.filter((item) => role && item.roles.includes(role))

  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col bg-sidebar text-sidebar-foreground lg:flex">
      <div className="flex items-center gap-3 px-6 py-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10">
          <Store className="h-5 w-5 text-white" />
        </div>
        <span className="text-lg font-bold text-white">{t('app.name')}</span>
      </div>

      <nav className="flex-1 space-y-1 px-4 py-2">
        {filteredItems.map((item) => {
          const active = location.pathname === item.path
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                'flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors',
                active
                  ? 'bg-sidebar-active text-sidebar-active-foreground shadow-lg shadow-indigo-900/40'
                  : 'text-sidebar-foreground hover:bg-white/5 hover:text-white'
              )}
            >
              <item.icon className={cn('h-[1.15rem] w-[1.15rem]', active ? 'text-white' : 'text-sidebar-muted')} />
              {t(item.label)}
            </Link>
          )
        })}
      </nav>

      <div className="p-4">
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-sidebar-foreground hover:bg-white/5 hover:text-white"
          onClick={logout}
        >
          <LogOut className="h-4 w-4" />
          {t('nav.logout')}
        </Button>
      </div>
    </aside>
  )
}
