import { useEffect, type ReactNode } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase'
import { useAuth } from '@/hooks/useAuth'
import { useAuthStore } from '@/store/authStore'
import type { UserRole } from '@/types'

const VALID_ROLES: UserRole[] = ['owner', 'manager', 'cashier', 'staff']

/**
 * Mounts a single Firebase auth listener for the whole app and keeps the auth
 * store in sync. Rendering it once (in App) avoids the redundant listeners and
 * re-render storms that come from calling the listener effect in every guard.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const { setUser, setRole, setBranchId, setLoading, clear } = useAuthStore()
  const { loading } = useAuth()

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        clear()
        setLoading(false)
        return
      }

      setUser(firebaseUser)

      // Prefer the custom claim for role; fall back to the Firestore /users doc so a
      // missing/stale claim can never lock the user into a redirect loop. The /users
      // doc is always read to resolve the cashier's branch assignment.
      let resolved: UserRole | null = null
      try {
        const tokenResult = await firebaseUser.getIdTokenResult()
        const claimRole = tokenResult.claims.role as UserRole | undefined
        if (claimRole && VALID_ROLES.includes(claimRole)) resolved = claimRole
      } catch {
        // ignore — fall through to Firestore lookup
      }

      try {
        const snap = await getDoc(doc(db, 'users', firebaseUser.uid))
        if (snap.exists()) {
          const data = snap.data()
          const docRole = data.role as UserRole | undefined
          if (!resolved && docRole && VALID_ROLES.includes(docRole)) resolved = docRole
          setBranchId((data.branchId as string) || null)
        } else {
          setBranchId(null)
        }
      } catch {
        setBranchId(null)
      }

      setRole(resolved ?? 'cashier')
      setLoading(false)
    })

    return unsubscribe
  }, [setUser, setRole, setBranchId, setLoading, clear])

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  return <>{children}</>
}
