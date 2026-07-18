import { initializeApp } from 'firebase/app'
import { getAuth, connectAuthEmulator } from 'firebase/auth'
import {
  getFirestore,
  connectFirestoreEmulator,
  enableMultiTabIndexedDbPersistence,
} from 'firebase/firestore'
import { getStorage, connectStorageEmulator } from 'firebase/storage'
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions'

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

/** Whether the app is wired to the local Firebase Emulator Suite. */
export const useEmulators = import.meta.env.VITE_USE_EMULATORS === 'true'

const app = initializeApp(firebaseConfig)

export const auth = getAuth(app)
export const db = getFirestore(app)
export const storage = getStorage(app)
export const functions = getFunctions(app)

if (useEmulators) {
  // Point the SDK at the locally running Firebase Emulator Suite.
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })
  connectFirestoreEmulator(db, '127.0.0.1', 8080)
  connectStorageEmulator(storage, '127.0.0.1', 9199)
  connectFunctionsEmulator(functions, '127.0.0.1', 5001)
  console.info('🔥 Firebase connected to local emulators')
} else {
  // Enable offline persistence only against the real backend.
  try {
    enableMultiTabIndexedDbPersistence(db)
  } catch (err: unknown) {
    if (err instanceof Error && 'code' in err) {
      const error = err as { code: string }
      if (error.code === 'failed-precondition') {
        console.warn('Firestore persistence: multiple tabs open')
      } else if (error.code === 'unimplemented') {
        console.warn('Firestore persistence: browser not supported')
      }
    }
  }
}

export default app
