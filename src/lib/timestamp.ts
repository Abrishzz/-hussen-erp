import { Timestamp } from 'firebase/firestore'

export function now(): Timestamp {
  return Timestamp.fromDate(new Date())
}

export function dateToTimestamp(date: Date): Timestamp {
  return Timestamp.fromDate(date)
}

export function toDate(value: Timestamp | Date | undefined): Date | undefined {
  if (!value) return undefined
  return value instanceof Date ? value : value.toDate()
}
