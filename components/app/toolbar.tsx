'use client'

import type { ReactNode } from 'react'
import { Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'

export function Toolbar({ search, onSearch, placeholder = 'Rechercher…', children }: { search: string; onSearch: (v: string) => void; placeholder?: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border bg-card p-3 shadow-sm lg:flex-row lg:items-center">
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <Input value={search} onChange={(e) => onSearch(e.target.value)} placeholder={placeholder} aria-label={placeholder} className="h-9 bg-background pr-9 pl-9" />
        {search && (
          <button type="button" onClick={() => onSearch('')} className="absolute top-1/2 right-2.5 -translate-y-1/2 rounded-sm p-0.5 text-muted-foreground hover:text-foreground" aria-label="Effacer la recherche">
            <X className="size-3.5" />
          </button>
        )}
      </div>
      {children && <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center [&>*]:sm:w-44">{children}</div>}
    </div>
  )
}

export function matches(query: string, ...fields: Array<string | number | undefined | null>) {
  const q = query
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
  if (!q) return true
  const hay = fields
    .filter((f) => f !== undefined && f !== null)
    .join(' ')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
  return q.split(/\s+/).every((part) => hay.includes(part))
}
