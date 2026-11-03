'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Sparkles } from 'lucide-react'
import { canAccess, NAV_GROUPS } from '@/lib/permissions'
import type { Role } from '@/lib/types'
import { cn } from '@/lib/utils'
import { Logo } from './logo'

export function SidebarNav({ role, onNavigate }: { role: Role; onNavigate?: () => void }) {
  const pathname = usePathname()
  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex h-16 items-center px-5">
        <Logo className="text-white" />
      </div>
      <nav aria-label="Navigation principale" className="flex-1 overflow-y-auto px-3 pt-4 pb-6 [scrollbar-width:thin]">
        {NAV_GROUPS.map((group) => {
          const items = group.items.filter((i) => canAccess(role, i.key))
          if (!items.length) return null
          return (
            <div key={group.label} className="mb-5">
              <p className="mb-1.5 px-3 text-[10px] font-semibold tracking-[0.2em] text-sidebar-foreground/45 uppercase">{group.label}</p>
              <ul className="flex flex-col gap-0.5">
                {items.map((item) => {
                  const active = pathname === item.href || pathname.startsWith(item.href + '/')
                  return (
                    <li key={item.key}>
                      <Link
                        href={item.href}
                        prefetch={false}
                        onClick={onNavigate}
                        aria-current={active ? 'page' : undefined}
                        className={cn(
                          'group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200',
                          active ? 'bg-sidebar-accent text-white' : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-white',
                        )}
                      >
                        <span className={cn('absolute top-1/2 left-0 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-sidebar-primary transition-all duration-300', active ? 'opacity-100' : 'h-0 opacity-0')} />
                        <item.icon className={cn('size-4 transition-colors', active ? 'text-sidebar-primary' : 'text-sidebar-foreground/50 group-hover:text-sidebar-primary')} />
                        {item.label}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </div>
          )
        })}
      </nav>
      <div className="m-3 rounded-xl border border-sidebar-border bg-gradient-to-br from-sidebar-accent to-sidebar p-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-white">
          <Sparkles className="size-4 text-sidebar-primary" />
          Année scolaire
        </div>
        <p className="mt-1 text-xs text-sidebar-foreground/60">Vos pages et données sont limitées à votre rôle.</p>
      </div>
    </div>
  )
}

export function AppSidebar({ role }: { role: Role }) {
  return (
    <aside className="no-print fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-sidebar-border lg:block">
      <SidebarNav role={role} />
    </aside>
  )
}
