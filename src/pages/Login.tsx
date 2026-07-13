import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Store, Languages, ShieldCheck, ShoppingCart, ChefHat, ChevronRight } from 'lucide-react'
import { roleHome } from '@/components/auth/ProtectedRoute'
import type { UserRole } from '@/types'

interface DemoUser {
  email: string
  role: UserRole
  icon: React.ElementType
}

// Curated demo accounts (all seeded with the same password) for one-tap sign-in.
const DEMO_PASSWORD = 'password123'
const DEMO_USERS: DemoUser[] = [
  { email: 'owner@hussenbakery.com', role: 'owner', icon: ShieldCheck },
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

  const toggleLang = () => {
    i18n.changeLanguage(i18n.language === 'en' ? 'am' : 'en')
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/5 to-primary/10 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary">
            <Store className="h-6 w-6 text-primary-foreground" />
          </div>
          <CardTitle className="text-xl">{t('auth.loginTitle')}</CardTitle>
          <CardDescription>{t('auth.loginSubtitle')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">{t('auth.email')}</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@hussenbakery.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
                required
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && !pendingEmail ? t('common.loading') : t('auth.login')}
            </Button>
          </form>

          {/* Quick login — demo accounts */}
          <div className="mt-6">
            <div className="relative mb-3 text-center">
              <span className="relative z-10 bg-card px-3 text-xs uppercase tracking-wide text-muted-foreground">
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
                  className="flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors hover:border-primary hover:bg-accent disabled:opacity-60"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <user.icon className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium">{t(`auth.roles.${user.role}`)}</span>
                    <span className="block truncate text-xs text-muted-foreground">{user.email}</span>
                  </span>
                  {pendingEmail === user.email ? (
                    <span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  ) : (
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 text-center">
            <Button variant="ghost" size="sm" onClick={toggleLang}>
              <Languages className="mr-2 h-4 w-4" />
              {i18n.language === 'en' ? 'Amharic' : 'English'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
