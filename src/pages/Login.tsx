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
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-gradient-to-br from-indigo-950 via-violet-950 to-slate-950 text-white selection:bg-primary/30">
      {/* Animated futuristic background elements */}
      <div className="pointer-events-none absolute -right-24 -top-24 h-[40rem] w-[40rem] rounded-full bg-indigo-500/15 blur-[100px] animate-pulse" />
      <div className="pointer-events-none absolute -bottom-32 -left-16 h-[50rem] w-[50rem] rounded-full bg-fuchsia-500/15 blur-[120px] animate-pulse" style={{ animationDelay: '2s' }} />
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[30rem] w-[30rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-[80px]" />

      {/* Main glass container */}
      <div className="relative z-10 flex w-full max-w-[1200px] flex-col lg:flex-row overflow-hidden min-h-screen lg:min-h-0 lg:rounded-[2.5rem] lg:bg-white/5 lg:backdrop-blur-3xl lg:shadow-2xl lg:border lg:border-white/10 lg:m-6">
        
        {/* Brand / Illustration Panel */}
        <div className="flex flex-col items-center justify-center p-8 pt-12 lg:w-1/2 lg:p-12 lg:bg-black/20">
          <div className="flex w-full items-center gap-3 justify-center lg:justify-start mb-8 lg:mb-12">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 shadow-xl">
              <Store className="h-6 w-6 text-white" />
            </div>
            <span className="text-2xl font-bold tracking-tight text-white drop-shadow-md">{t('app.name')}</span>
          </div>

          <div className="relative flex flex-1 flex-col items-center justify-center w-full max-w-sm mx-auto">
            <BakeryArt className="w-[16rem] sm:w-[20rem] lg:w-[24rem] max-w-full drop-shadow-2xl transition-transform duration-700 hover:scale-105 anim-floaty" />
            <div className="mt-8 space-y-4 text-center">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold leading-tight tracking-tight text-white drop-shadow-lg">
                Freshly baked<br className="hidden sm:block" /> management.
              </h1>
              <p className="mx-auto max-w-sm text-sm sm:text-base text-white/80 font-medium">
                Sales, inventory, production, HR &amp; finance — one modern, chart-rich dashboard.
              </p>
            </div>
          </div>
          
          <div className="mt-10 hidden lg:flex w-full justify-center gap-12 text-sm">
            <div className="text-center">
              <p className="text-2xl font-bold text-white">99.9%</p>
              <p className="text-white/60">Uptime</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-white">2×</p>
              <p className="text-white/60">Faster checkout</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-white">EN · አማ</p>
              <p className="text-white/60">Bilingual</p>
            </div>
          </div>
        </div>

        {/* Form Panel */}
        <div className="flex w-full flex-col items-center justify-center p-6 lg:p-12 lg:w-1/2 bg-background/95 lg:bg-background/60 backdrop-blur-2xl rounded-t-[2.5rem] lg:rounded-none shadow-[0_-20px_40px_rgba(0,0,0,0.2)] lg:shadow-none border-t border-white/10 lg:border-t-0 lg:border-l relative z-20 flex-1 lg:flex-none">
          <div className="w-full max-w-sm mx-auto flex flex-col justify-center h-full text-foreground">
            <div className="mb-8 mt-2 lg:mt-0">
              <h2 className="text-3xl font-bold bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">{t('auth.loginTitle')}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{t('auth.loginSubtitle')}</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">{t('auth.email')}</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@hussenbakery.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-12 rounded-xl bg-background/50 backdrop-blur-sm transition-all focus:bg-background"
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
                  className="h-12 rounded-xl bg-background/50 backdrop-blur-sm transition-all focus:bg-background"
                  required
                />
              </div>
              {error && <p className="text-sm text-destructive font-medium">{error}</p>}
              <Button type="submit" className="h-12 w-full rounded-xl text-base font-semibold shadow-lg shadow-primary/25 transition-all hover:shadow-primary/40 hover:-translate-y-0.5" disabled={loading}>
                {loading && !pendingEmail ? t('common.loading') : t('auth.login')}
              </Button>
            </form>

            <div className="mt-8">
              <div className="relative mb-5 text-center">
                <span className="relative z-10 bg-transparent px-3 text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                  {t('auth.demoAccounts')}
                </span>
                <span className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-border/50" />
              </div>
              <div className="space-y-3">
                {DEMO_USERS.map((user) => (
                  <button
                    key={user.email}
                    type="button"
                    disabled={loading}
                    onClick={() => handleQuickLogin(user)}
                    className="group flex w-full items-center gap-4 rounded-2xl border border-border/50 bg-card/40 backdrop-blur-sm p-3.5 text-left transition-all hover:border-primary/50 hover:bg-card/80 hover:shadow-lg hover:-translate-y-0.5 disabled:opacity-50"
                  >
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground shadow-sm">
                      <user.icon className="h-5 w-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-card-foreground">{t(`auth.roles.${user.role}`)}</span>
                      <span className="block truncate text-xs text-muted-foreground/80">{user.email}</span>
                    </span>
                    {pendingEmail === user.email ? (
                      <span className="h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    ) : (
                      <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground/50 transition-transform group-hover:translate-x-1 group-hover:text-primary" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-8 text-center pb-8 lg:pb-0">
              <Button variant="ghost" size="sm" onClick={toggleLang} className="rounded-full hover:bg-background/60">
                <Languages className="mr-2 h-4 w-4" />
                {i18n.language === 'en' ? 'Amharic' : 'English'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
