import { initializeApp, deleteApp } from 'firebase/app'
import {
  getAuth,
  connectAuthEmulator,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut,
} from 'firebase/auth'
import { doc, setDoc, Timestamp } from 'firebase/firestore'
import { db, firebaseConfig, useEmulators } from '@/lib/firebase'
import type { UserRole } from '@/types'

export interface NewUserInput {
  email: string
  password: string
  displayName: string
  role: UserRole
  phone?: string
  branchId?: string
}

/**
 * Creates a login account for the site.
 *
 * Firebase's `createUserWithEmailAndPassword` signs the new user in on whichever
 * auth instance runs it — which would boot the owner out of their own session.
 * To avoid that, we spin up a throwaway *secondary* Firebase app, create the
 * user there, then tear it down. The owner's primary session is untouched.
 *
 * The `/users/{uid}` document (which the security rules read for role
 * resolution) is written with the owner's still-authenticated primary session.
 */
export async function createUserAccount(input: NewUserInput): Promise<string> {
  const secondaryApp = initializeApp(firebaseConfig, `admin-create-${Date.now()}`)
  const secondaryAuth = getAuth(secondaryApp)
  if (useEmulators) {
    connectAuthEmulator(secondaryAuth, 'http://127.0.0.1:9099', { disableWarnings: true })
  }

  try {
    const cred = await createUserWithEmailAndPassword(secondaryAuth, input.email, input.password)
    if (input.displayName) {
      await updateProfile(cred.user, { displayName: input.displayName })
    }

    // Written by the owner's primary session (has owner rights per rules).
    await setDoc(doc(db, 'users', cred.user.uid), {
      email: input.email,
      displayName: input.displayName,
      role: input.role,
      phone: input.phone || '',
      branchId: input.branchId || '',
      isActive: true,
      language: 'en',
      createdAt: Timestamp.now(),
    })

    await signOut(secondaryAuth)
    return cred.user.uid
  } finally {
    await deleteApp(secondaryApp)
  }
}
