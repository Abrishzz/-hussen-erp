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
  { label: 'nav.production', path: '/production', icon: Factory, roles: ['owner', 'staff'] },
  { label: 'nav.hr', path: '/hr', icon: Users, roles: ['owner'] },
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
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r bg-card lg:flex">
      <div className="flex shrink-0 items-center gap-2 border-b px-6 py-4">
        <Store className="h-6 w-6 text-primary" />
        <span className="text-lg font-bold">{t('app.name')}</span>
      </div>

      {/* Only the link list scrolls, so the brand header and Logout stay pinned. */}
      <nav className="flex-1 space-y-1 overflow-y-auto p-4">
        {filteredItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              location.pathname === item.path
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            )}
          >
            <item.icon className="h-4 w-4" />
            {t(item.label)}
          </Link>
        ))}
      </nav>

      <div className="border-t p-4">
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-muted-foreground"
          onClick={logout}
        >
          <LogOut className="h-4 w-4" />
          {t('nav.logout')}
        </Button>
      </div>
    </aside>
  )
}
