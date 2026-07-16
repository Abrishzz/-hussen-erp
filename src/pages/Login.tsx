import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Store, Languages, ShieldCheck, ShoppingCart, ChefHat, Warehouse, ChevronRight } from 'lucide-react'
import { roleHome } from '@/components/auth/ProtectedRoute'
import { BakeryArt } from '@/components/BakeryArt'
import type { UserRole } from '@/types'

interface DemoUser {
  email: string
  role: UserRole
  icon: React.ElementType
}

const DEMO_PASSWORD = 'password123'
const DEMO_USERS: DemoUser[] = [
  { email: 'owner@hussenbakery.com', role: 'owner', icon: ShieldCheck },
  { email: 'manager@hussenbakery.com', role: 'manager', icon: Warehouse },
  { email: 'cashier@hussenbakery.com', role: 'cashier', icon: ShoppingCart },
  { email: 'staff@hussenbakery.com', role: 'staff', icon: ChefHat },
]

export default function Login() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [pendingEmail, setPendingEmail] = useState<string | null>(null)

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname

  const signIn = async (emailValue: string, passwordValue: string, destination?: string) => {
    setError('')
    setLoading(true)
    try {
      await signInWithEmailAndPassword(auth, emailValue, passwordValue)
      navigate(from || destination || '/dashboard', { replace: true })
    } catch {
      setError(t('auth.invalidCredentials'))
    } finally {
      setLoading(false)
      setPendingEmail(null)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await signIn(email, password)
  }

  const handleQuickLogin = async (user: DemoUser) => {
    setPendingEmail(user.email)
    await signIn(user.email, DEMO_PASSWORD, roleHome(user.role))
  }

  const toggleLang = () => i18n.changeLanguage(i18n.language === 'en' ? 'am' : 'en')

  return (
    <div className="flex min-h-screen bg-background">
      {/* Brand / illustration panel */}
      <div className="relative hidden w-1/2 flex-col overflow-hidden bg-gradient-to-br from-indigo-600 via-violet-600 to-indigo-800 p-12 text-white lg:flex">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-16 h-80 w-80 rounded-full bg-fuchsia-400/20 blur-3xl" />

        <div className="relative flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
            <Store className="h-6 w-6" />
          </div>
          <span className="text-xl font-bold tracking-tight">{t('app.name')}</span>
        </div>

        <div className="relative flex flex-1 flex-col items-center justify-center">
          <BakeryArt className="w-[24rem] max-w-full drop-shadow-2xl" />
          <div className="mt-4 space-y-3 text-center">
            <h1 className="text-4xl font-bold leading-tight">
              Freshly baked<br />management.
            </h1>
            <p className="mx-auto max-w-sm text-white/70">
              Sales, inventory, production, HR &amp; finance — one modern, chart-rich dashboard.
            </p>
          </div>
        </div>

        <div className="relative flex justify-center gap-10 text-sm">
          <div className="text-center">
            <p className="text-2xl font-bold">99.9%</p>
            <p className="text-white/60">Uptime</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold">2×</p>
            <p className="text-white/60">Faster checkout</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold">EN · አማ</p>
            <p className="text-white/60">Bilingual</p>
          </div>
        </div>
      </div>

      {/* Form panel */}
      <div className="flex w-full items-center justify-center p-6 lg:w-1/2">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
              <Store className="h-6 w-6" />
            </div>
            <span className="text-lg font-bold">{t('app.name')}</span>
          </div>

          <h2 className="text-2xl font-bold">{t('auth.loginTitle')}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t('auth.loginSubtitle')}</p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">{t('auth.email')}</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@hussenbakery.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t('auth.password')}</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11"
                required
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="h-11 w-full text-base" disabled={loading}>
              {loading && !pendingEmail ? t('common.loading') : t('auth.login')}
            </Button>
          </form>

          <div className="mt-7">
            <div className="relative mb-3 text-center">
              <span className="relative z-10 bg-background px-3 text-xs uppercase tracking-wide text-muted-foreground">
                {t('auth.demoAccounts')}
              </span>
              <span className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-border" />
            </div>
            <div className="space-y-2">
              {DEMO_USERS.map((user) => (
                <button
                  key={user.email}
                  type="button"
                  disabled={loading}
                  onClick={() => handleQuickLogin(user)}
                  className="group flex w-full items-center gap-3 rounded-xl border bg-card p-3 text-left transition-all hover:border-primary hover:shadow-card disabled:opacity-60"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                    <user.icon className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold">{t(`auth.roles.${user.role}`)}</span>
                    <span className="block truncate text-xs text-muted-foreground">{user.email}</span>
                  </span>
                  {pendingEmail === user.email ? (
                    <span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  ) : (
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6 text-center">
            <Button variant="ghost" size="sm" onClick={toggleLang}>
              <Languages className="mr-2 h-4 w-4" />
              {i18n.language === 'en' ? 'Amharic' : 'English'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
