import { useEffect } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase'
import { useAuthStore } from '@/store/authStore'
import type { UserRole } from '@/types'

const VALID_ROLES: UserRole[] = ['owner', 'cashier', 'staff']

/**
 * Mounts a single Firebase auth listener for the whole app and keeps the auth
 * store in sync. Rendering it once (in App) avoids the redundant listeners and
 * re-render storms that come from calling the listener effect in every guard.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setUser, setRole, setLoading, clear } = useAuthStore()

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        clear()
        setLoading(false)
        return
      }

      setUser(firebaseUser)

      // Prefer the custom claim; fall back to the Firestore /users doc so a
      // missing/stale claim can never lock the user into a redirect loop.
      let resolved: UserRole | null = null
      try {
        const tokenResult = await firebaseUser.getIdTokenResult()
        const claimRole = tokenResult.claims.role as UserRole | undefined
        if (claimRole && VALID_ROLES.includes(claimRole)) resolved = claimRole
      } catch {
        // ignore — fall through to Firestore lookup
      }

      if (!resolved) {
        try {
          const snap = await getDoc(doc(db, 'users', firebaseUser.uid))
          const docRole = snap.exists() ? (snap.data().role as UserRole | undefined) : undefined
          if (docRole && VALID_ROLES.includes(docRole)) resolved = docRole
        } catch {
          // ignore
        }
      }

      setRole(resolved ?? 'cashier')
      setLoading(false)
    })

    return unsubscribe
  }, [setUser, setRole, setLoading, clear])

  return <>{children}</>
}
