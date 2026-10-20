import type { LucideIcon } from 'lucide-react'
import { ArrowDownRight, ArrowUpRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StatCardProps {
  label: string
  value: string
  icon: LucideIcon
  hint?: string
  trend?: number
  tone?: 'navy' | 'gold' | 'success' | 'danger'
  delay?: number
}

const TONES = {
  navy: 'bg-primary/10 text-primary dark:bg-primary/15',
  gold: 'bg-gold/15 text-[oklch(0.5_0.11_75)] dark:text-gold',
  success: 'bg-success/12 text-success',
  danger: 'bg-destructive/10 text-destructive',
}

export function StatCard({ label, value, icon: Icon, hint, trend, tone = 'navy', delay = 0 }: StatCardProps) {
  return (
    <div
      className="group relative overflow-hidden rounded-2xl border bg-card p-5 shadow-sm transition-all duration-300 animate-in fade-in slide-in-from-bottom-3 fill-mode-both hover:-translate-y-0.5 hover:shadow-md"
      style={{ animationDelay: `${delay}ms`, animationDuration: '600ms' }}
    >
      <div className="pointer-events-none absolute -top-10 -right-10 size-28 rounded-full bg-gold/10 opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100" />
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className="truncate text-2xl font-semibold tracking-tight tabular-nums text-foreground">{value}</p>
        </div>
        <div className={cn('flex size-11 shrink-0 items-center justify-center rounded-xl', TONES[tone])}>
          <Icon className="size-5" aria-hidden="true" />
        </div>
      </div>
      {(hint || trend !== undefined) && (
        <div className="mt-3 flex items-center gap-2 text-xs">
          {trend !== undefined && (
            <span className={cn('inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 font-semibold', trend >= 0 ? 'bg-success/12 text-success' : 'bg-destructive/10 text-destructive')}>
              {trend >= 0 ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
              {Math.abs(trend).toFixed(1).replace('.', ',')}%
            </span>
          )}
          {hint && <span className="text-muted-foreground">{hint}</span>}
        </div>
      )}
    </div>
  )
}
