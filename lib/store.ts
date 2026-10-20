'use client'

import { useSyncExternalStore } from 'react'
import { createSeed, DB_VERSION } from './seed'
import type { AppNotification, CollectionKey, Database, EntityOf } from './types'

const STORAGE_KEY = 'scolaris-db'

let state: Database | null = null
const listeners = new Set<() => void>()

function load(): Database {
  if (state) return state
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Database
      if (parsed.version === DB_VERSION) {
        state = parsed
        return state
      }
    }
  } catch {
    // Corrupted storage falls back to a fresh seed below.
  }
  state = createSeed()
  persist()
  return state
}

function persist() {
  if (!state) return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Quota errors are non-fatal: the in-memory state remains usable.
  }
}

function setState(updater: (db: Database) => Database) {
  state = updater(load())
  persist()
  listeners.forEach((l) => l())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) {
      state = null
      listener()
    }
  }
  window.addEventListener('storage', onStorage)
  return () => {
    listeners.delete(listener)
    window.removeEventListener('storage', onStorage)
  }
}

export function useDB(): Database | null {
  return useSyncExternalStore(subscribe, load, () => null)
}

export const uid = (prefix = 'id') => `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`

export const db = {
  get: () => load(),
  add<K extends CollectionKey>(key: K, item: Omit<EntityOf<K>, 'id'> & { id?: string }) {
    const entity = { ...item, id: item.id ?? uid(String(key).slice(0, 2)) } as EntityOf<K>
    setState((d) => ({ ...d, [key]: [entity, ...(d[key] as EntityOf<K>[])] }))
    return entity
  },
  addMany<K extends CollectionKey>(key: K, items: EntityOf<K>[]) {
    setState((d) => ({ ...d, [key]: [...items, ...(d[key] as EntityOf<K>[])] }))
  },
  update<K extends CollectionKey>(key: K, id: string, patch: Partial<EntityOf<K>>) {
    setState((d) => ({
      ...d,
      [key]: (d[key] as EntityOf<K>[]).map((e) => (e.id === id ? { ...e, ...patch } : e)),
    }))
  },
  remove<K extends CollectionKey>(key: K, id: string) {
    setState((d) => ({ ...d, [key]: (d[key] as EntityOf<K>[]).filter((e) => e.id !== id) }))
  },
  replaceWhere<K extends CollectionKey>(key: K, predicate: (e: EntityOf<K>) => boolean, items: EntityOf<K>[]) {
    setState((d) => ({ ...d, [key]: [...items, ...(d[key] as EntityOf<K>[]).filter((e) => !predicate(e))] }))
  },
  notify(n: Omit<AppNotification, 'id' | 'createdAt' | 'read'>) {
    const notification: AppNotification = { ...n, id: uid('n'), createdAt: new Date().toISOString(), read: false }
    setState((d) => ({ ...d, notifications: [notification, ...d.notifications].slice(0, 50) }))
    return notification
  },
  markAllRead() {
    setState((d) => ({ ...d, notifications: d.notifications.map((n) => ({ ...n, read: true })) }))
  },
  login(email: string, password: string) {
    const user = load().users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase())
    if (!user || user.password !== password) return { ok: false as const, error: 'Identifiants incorrects.' }
    if (user.status !== 'actif') return { ok: false as const, error: 'Ce compte est désactivé.' }
    setState((d) => ({
      ...d,
      session: { userId: user.id },
      users: d.users.map((u) => (u.id === user.id ? { ...u, lastLogin: new Date().toISOString() } : u)),
    }))
    return { ok: true as const, user }
  },
  logout() {
    setState((d) => ({ ...d, session: null }))
  },
  updateSettings(patch: Partial<Database['settings']>) {
    setState((d) => ({ ...d, settings: { ...d.settings, ...patch } }))
  },
  reset() {
    const session = load().session
    state = { ...createSeed(), session }
    persist()
    listeners.forEach((l) => l())
  },
}

export function useCurrentUser() {
  const data = useDB()
  if (!data?.session) return null
  return data.users.find((u) => u.id === data.session!.userId) ?? null
}
