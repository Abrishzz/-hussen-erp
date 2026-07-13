import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  type QueryConstraint,
  type DocumentData,
  type FirestoreError,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'

export function useCollection<T = DocumentData>(
  collectionName: string,
  constraints: QueryConstraint[] = []
) {
  return useQuery<T[]>({
    queryKey: [collectionName, ...constraints],
    queryFn: async () => {
      const q = query(collection(db, collectionName), ...constraints)
      const snapshot = await getDocs(q)
      return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as T))
    },
  })
}

export function useDocument<T = DocumentData>(collectionName: string, documentId: string | undefined) {
  return useQuery<T | null>({
    queryKey: [collectionName, documentId],
    enabled: !!documentId,
    queryFn: async () => {
      if (!documentId) return null
      const docRef = doc(db, collectionName, documentId)
      const snapshot = await getDoc(docRef)
      if (!snapshot.exists()) return null
      return { id: snapshot.id, ...snapshot.data() } as T
    },
  })
}

export function useAddDocument(collectionName: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: DocumentData) => {
      const docRef = await addDoc(collection(db, collectionName), data)
      return { id: docRef.id, ...data }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [collectionName] })
    },
  })
}

export function useUpdateDocument(collectionName: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: DocumentData }) => {
      const docRef = doc(db, collectionName, id)
      await updateDoc(docRef, data)
      return { id, ...data }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [collectionName] })
    },
  })
}

export function useDeleteDocument(collectionName: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      await deleteDoc(doc(db, collectionName, id))
      return id
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [collectionName] })
    },
  })
}

export { where, orderBy, limit }
export type { QueryConstraint, DocumentData, FirestoreError }
