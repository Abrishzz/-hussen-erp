import { signOut } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { useAuthStore } from '@/store/authStore'

/**
 * Reads the shared auth state. The single Firebase listener lives in
 * <AuthProvider/> (mounted once in App) — this hook only selects from the store.
 */
export function useAuth() {
  const { user, role, loading } = useAuthStore()

  const logout = async () => {
    await signOut(auth)
    useAuthStore.getState().clear()
  }

  return { user, role, loading, logout }
}
