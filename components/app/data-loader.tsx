'use client'
import { Loader2 } from 'lucide-react'
import { useLoading } from '@/lib/loading'
export function DataLoader() {
 const loading = useLoading()
 if (!loading) return null
 return <div role="status" aria-live="polite" className="no-print fixed inset-0 z-[100] flex items-center justify-center bg-background/65 backdrop-blur-sm"><div className="flex items-center gap-3 rounded-xl border bg-card p-5 shadow-xl"><Loader2 className="size-6 animate-spin text-gold" /><span>Chargement des données…</span></div></div>
}
