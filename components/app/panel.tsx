import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function Panel({ title, description, action, children, className, delay = 0 }: { title?: string; description?: string; action?: ReactNode; children: ReactNode; className?: string; delay?: number }) {
  return (
    <section
      className={cn('flex flex-col rounded-2xl border bg-card p-5 shadow-sm animate-in fade-in slide-in-from-bottom-3 fill-mode-both', className)}
      style={{ animationDelay: `${delay}ms`, animationDuration: '600ms' }}
    >
      {(title || action) && (
        <header className="mb-4 flex items-start justify-between gap-3">
          <div>
            {title && <h2 className="text-base font-semibold">{title}</h2>}
            {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
          </div>
          {action}
        </header>
      )}
      {children}
    </section>
  )
}
