'use client'

import { useEffect, useMemo, useState, type KeyboardEvent } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, Search } from 'lucide-react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { ALL_NAV, canAccess } from '@/lib/permissions'
import type { Role } from '@/lib/types'
import { cn } from '@/lib/utils'
import { matches } from './toolbar'

interface ResultItem {
  id: string
  label: string
  sub: string
  href: string
  icon: typeof Search
}

export function CommandSearch({ role }: { role: Role }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const router = useRouter()

  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen((o) => !o)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const results = useMemo<ResultItem[]>(() => {
    return ALL_NAV.filter((n) => canAccess(role, n.key) && matches(query, n.label)).map((n) => ({ id: n.key, label: n.label, sub: 'Module', href: n.href, icon: n.icon }))
  }, [query, role])

  const go = (item: ResultItem) => {
    setOpen(false)
    setQuery('')
    router.push(item.href)
  }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((a) => Math.min(a + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((a) => Math.max(a - 1, 0))
    } else if (e.key === 'Enter' && !e.nativeEvent.isComposing && e.keyCode !== 229 && results[active]) {
      e.preventDefault()
      go(results[active])
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-9 items-center gap-2 rounded-lg border bg-muted/50 px-2.5 text-sm text-muted-foreground transition-colors hover:bg-muted sm:w-56 md:w-64"
        aria-label="Recherche globale"
      >
        <Search className="size-4" />
        <span className="hidden sm:inline">Rechercher…</span>
        <kbd className="ml-auto hidden rounded border bg-background px-1.5 py-0.5 font-sans text-[10px] font-medium sm:inline">Ctrl K</kbd>
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-lg" showCloseButton={false}>
          <DialogTitle className="sr-only">Recherche globale</DialogTitle>
          <div className="flex items-center gap-3 border-b px-4">
            <Search className="size-4 text-muted-foreground" />
            <input
              autoFocus
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setActive(0)
              }}
              onKeyDown={onKeyDown}
              placeholder="Rechercher une page…"
              className="h-12 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              aria-label="Rechercher"
            />
          </div>
          <ul className="max-h-80 overflow-y-auto p-2" role="listbox">
            {results.length === 0 && <li className="px-3 py-8 text-center text-sm text-muted-foreground">Aucun résultat</li>}
            {results.map((r, i) => (
              <li key={r.id} role="option" aria-selected={i === active}>
                <button
                  type="button"
                  onMouseEnter={() => setActive(i)}
                  onClick={() => go(r)}
                  className={cn('flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors', i === active && 'bg-muted')}
                >
                  <span className="flex size-8 items-center justify-center rounded-md bg-primary/10 text-primary dark:text-gold">
                    <r.icon className="size-4" />
                  </span>
                  <span className="flex flex-1 flex-col">
                    <span className="font-medium">{r.label}</span>
                    <span className="text-xs text-muted-foreground">{r.sub}</span>
                  </span>
                  {i === active && <ArrowRight className="size-4 text-muted-foreground" />}
                </button>
              </li>
            ))}
          </ul>
        </DialogContent>
      </Dialog>
    </>
  )
}
