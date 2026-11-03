'use client'
import { useSyncExternalStore } from 'react'
let count = 0
const listeners = new Set<() => void>()
export function changeLoading(delta: number) { count = Math.max(0, count + delta); listeners.forEach(fn => fn()) }
export function useLoading() { return useSyncExternalStore(fn => { listeners.add(fn); return () => { listeners.delete(fn) } }, () => count > 0, () => false) }
