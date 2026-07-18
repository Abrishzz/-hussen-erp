import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  ShoppingCart,
  Receipt,
  Croissant,
  Package,
  Factory,
  Users,
  UserCog,
  Wallet,
  BarChart3,
  TrendingUp,
  Settings,
  MoreHorizontal,
  Warehouse,
  Banknote,
  Building2,
} from 'lucide-react'
import { LogOut } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAuthStore } from '@/store/authStore'
import { useAuth } from '@/hooks/useAuth'
import type { UserRole } from '@/types'

interface TabItem {
  label: string
  path: string
  icon: React.ElementType
  roles: UserRole[]
}

const tabItems: TabItem[] = [
  { label: 'nav.dashboard', path: '/dashboard', icon: LayoutDashboard, roles: ['owner', 'manager'] },
  { label: 'nav.pos', path: '/pos', icon: ShoppingCart, roles: ['owner', 'cashier'] },
  { label: 'nav.mySales', path: '/my-sales', icon: Receipt, roles: ['owner', 'cashier'] },
  { label: 'nav.cashClose', path: '/cash-close', icon: Banknote, roles: ['owner', 'manager', 'cashier'] },
  { label: 'nav.distribution', path: '/distribution', icon: Warehouse, roles: ['owner', 'manager'] },
  { label: 'nav.inventory', path: '/inventory', icon: Package, roles: ['owner', 'staff'] },
  { label: 'nav.production', path: '/production', icon: Factory, roles: ['owner', 'staff', 'manager'] },
  { label: 'nav.products', path: '/products', icon: Croissant, roles: ['owner'] },
  { label: 'nav.finance', path: '/finance', icon: Wallet, roles: ['owner'] },
  { label: 'nav.hr', path: '/hr', icon: Users, roles: ['owner', 'manager'] },
  { label: 'nav.reports', path: '/reports', icon: BarChart3, roles: ['owner', 'manager'] },
  { label: 'nav.staffReport', path: '/staff-report', icon: TrendingUp, roles: ['owner', 'manager'] },
  { label: 'nav.branchReport', path: '/branch-report', icon: Building2, roles: ['owner', 'manager'] },
  { label: 'nav.branches', path: '/branches', icon: Building2, roles: ['owner'] },
  { label: 'nav.users', path: '/users', icon: UserCog, roles: ['owner'] },
  { label: 'nav.settings', path: '/settings', icon: Settings, roles: ['owner'] },
]

const MAX_PRIMARY = 4

function TabButton({ label, icon: Icon, active }: { label: string; icon: React.ElementType; active: boolean }) {
  return (
    <div
      className={cn(
        'flex h-full min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 py-1.5 transition-colors',
        active ? 'text-primary' : 'text-muted-foreground'
      )}
    >
      <span className={cn('flex h-8 w-8 items-center justify-center rounded-xl transition-colors', active && 'bg-primary/10')}>
        <Icon className="h-5 w-5" />
      </span>
      <span className="max-w-full truncate text-[10px] font-medium leading-none">{label}</span>
    </div>
  )
}

export function BottomTabBar() {
  const { t } = useTranslation()
  const location = useLocation()
  const { role } = useAuthStore()
  const { logout } = useAuth()

  const allowed = tabItems.filter((tab) => role && tab.roles.includes(role))
  // The "More" menu is always shown — it holds any overflow tabs plus Logout,
  // so a signed-in user can always sign out from mobile (e.g. a cashier with a
  // single POS tab would otherwise have no logout affordance).
  const hasOverflow = allowed.length > MAX_PRIMARY
  const primary = hasOverflow ? allowed.slice(0, MAX_PRIMARY) : allowed
  const overflow = hasOverflow ? allowed.slice(MAX_PRIMARY) : []
  const overflowActive = overflow.some((o) => o.path === location.pathname)
  const columns = primary.length + 1

  return (
    <nav className="fixed inset-x-3 bottom-3 z-40 lg:hidden">
      <div
        className="grid rounded-2xl border border-border/60 bg-card/90 p-1.5 shadow-card backdrop-blur"
        style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
      >
        {primary.map((tab) => (
          <Link key={tab.path} to={tab.path} aria-label={t(tab.label)}>
            <TabButton label={t(tab.label)} icon={tab.icon} active={location.pathname === tab.path} />
          </Link>
        ))}

        <DropdownMenu>
          <DropdownMenuTrigger aria-label={t('common.actions')}>
            <TabButton label={t('common.more')} icon={MoreHorizontal} active={overflowActive} />
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="end" className="mb-2 w-52">
            {overflow.map((tab) => (
              <DropdownMenuItem key={tab.path} asChild>
                <Link
                  to={tab.path}
                  className={cn('flex items-center gap-3', location.pathname === tab.path && 'text-primary')}
                >
                  <tab.icon className="h-4 w-4" />
                  {t(tab.label)}
                </Link>
              </DropdownMenuItem>
            ))}
            {overflow.length > 0 && <DropdownMenuSeparator />}
            <DropdownMenuItem
              onSelect={logout}
              className="flex items-center gap-3 text-destructive focus:text-destructive"
            >
              <LogOut className="h-4 w-4" />
              {t('nav.logout')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </nav>
  )
}
