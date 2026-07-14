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
  MoreHorizontal,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
  { label: 'nav.products', path: '/products', icon: Croissant, roles: ['owner'] },
  { label: 'nav.finance', path: '/finance', icon: Wallet, roles: ['owner'] },
  { label: 'nav.hr', path: '/hr', icon: Users, roles: ['owner'] },
  { label: 'nav.reports', path: '/reports', icon: BarChart3, roles: ['owner'] },
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

  const allowed = tabItems.filter((tab) => role && tab.roles.includes(role))
  const hasOverflow = allowed.length > MAX_PRIMARY + 1
  const primary = hasOverflow ? allowed.slice(0, MAX_PRIMARY) : allowed
  const overflow = hasOverflow ? allowed.slice(MAX_PRIMARY) : []
  const overflowActive = overflow.some((o) => o.path === location.pathname)
  const columns = primary.length + (overflow.length ? 1 : 0)

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

        {overflow.length > 0 && (
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
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </nav>
  )
}
