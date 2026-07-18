import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  ShoppingCart,
  Receipt,
  Package,
  Factory,
  Users,
  UserCog,
  Wallet,
  BarChart3,
  TrendingUp,
  Settings,
  LogOut,
  Store,
  Grid3X3,
  Warehouse,
  Banknote,
  Building2,
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
  { label: 'nav.dashboard', path: '/dashboard', icon: LayoutDashboard, roles: ['owner', 'manager'] },
  { label: 'nav.pos', path: '/pos', icon: ShoppingCart, roles: ['owner', 'cashier'] },
  { label: 'nav.mySales', path: '/my-sales', icon: Receipt, roles: ['owner', 'cashier'] },
  { label: 'nav.distribution', path: '/distribution', icon: Warehouse, roles: ['owner', 'manager'] },
  { label: 'nav.cashClose', path: '/cash-close', icon: Banknote, roles: ['owner', 'manager', 'cashier'] },
  { label: 'Products', path: '/products', icon: Grid3X3, roles: ['owner'] },
  { label: 'nav.inventory', path: '/inventory', icon: Package, roles: ['owner', 'staff'] },
  { label: 'nav.production', path: '/production', icon: Factory, roles: ['owner', 'staff', 'manager'] },
  { label: 'nav.hr', path: '/hr', icon: Users, roles: ['owner', 'manager'] },
  { label: 'nav.finance', path: '/finance', icon: Wallet, roles: ['owner'] },
  { label: 'nav.reports', path: '/reports', icon: BarChart3, roles: ['owner', 'manager'] },
  { label: 'nav.staffReport', path: '/staff-report', icon: TrendingUp, roles: ['owner', 'manager'] },
  { label: 'nav.branchReport', path: '/branch-report', icon: Building2, roles: ['owner', 'manager'] },
  { label: 'nav.branches', path: '/branches', icon: Building2, roles: ['owner'] },
  { label: 'nav.users', path: '/users', icon: UserCog, roles: ['owner'] },
  { label: 'nav.settings', path: '/settings', icon: Settings, roles: ['owner'] },
]

export function Sidebar() {
  const { t } = useTranslation()
  const location = useLocation()
  const { role } = useAuthStore()
  const { logout } = useAuth()

  const filteredItems = navItems.filter((item) => role && item.roles.includes(role))

  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col bg-gradient-to-b from-indigo-600 via-violet-600 to-indigo-700 text-white lg:flex">
      <div className="flex shrink-0 items-center gap-2.5 px-6 py-5">
        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
          <Store className="h-5 w-5" />
        </span>
        <span className="text-lg font-bold tracking-tight">{t('app.name')}</span>
      </div>

      {/* Only the link list scrolls, so the brand header and Logout stay pinned. */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
        {filteredItems.map((item) => {
          const active = location.pathname === item.path
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                'flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-sm font-medium transition-all',
                active
                  ? 'bg-white text-indigo-700 shadow-lg shadow-indigo-900/20'
                  : 'text-white/70 hover:bg-white/10 hover:text-white'
              )}
            >
              <item.icon className={cn('h-[18px] w-[18px]', active ? 'text-indigo-600' : '')} />
              {t(item.label)}
            </Link>
          )
        })}
      </nav>

      <div className="p-3">
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 rounded-2xl px-3.5 py-2.5 text-white/70 hover:bg-white/10 hover:text-white"
          onClick={logout}
        >
          <LogOut className="h-[18px] w-[18px]" />
          {t('nav.logout')}
        </Button>
      </div>
    </aside>
  )
}
