import { useEffect } from 'react'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase'
import { useAuthStore } from '@/store/authStore'
import type { UserRole } from '@/types'

export function useAuth() {
  const { user, role, loading, setUser, setRole, setLoading, clear } = useAuthStore()

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true)
      if (firebaseUser) {
        setUser(firebaseUser)
        // Get role from Firestore user document (fallback) or custom claims
        const idTokenResult = await firebaseUser.getIdTokenResult()
        const userRole = (idTokenResult.claims.role as UserRole) || 'cashier'
        setRole(userRole)
      } else {
        clear()
      }
      setLoading(false)
    })

    return unsubscribe
  }, [setUser, setRole, setLoading, clear])

  const logout = async () => {
    await signOut(auth)
    clear()
  }

  return { user, role, loading, logout }
}
