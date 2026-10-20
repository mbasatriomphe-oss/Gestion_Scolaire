import { initials } from '@/lib/format'
import { cn } from '@/lib/utils'

const PALETTE = [
  'bg-primary/10 text-primary',
  'bg-gold/20 text-[oklch(0.45_0.1_75)] dark:text-gold',
  'bg-chart-3/15 text-chart-3',
  'bg-chart-4/15 text-chart-4',
  'bg-chart-5/12 text-chart-5',
]

function hash(s: string) {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

export function Avatar({ name, className }: { name: string; className?: string }) {
  return (
    <span aria-hidden="true" className={cn('flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold', PALETTE[hash(name) % PALETTE.length], className)}>
      {initials(name)}
    </span>
  )
}

export function PersonCell({ name, sub }: { name: string; sub?: string }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <Avatar name={name} />
      <div className="flex min-w-0 flex-col">
        <span className="truncate font-medium text-foreground">{name}</span>
        {sub && <span className="truncate text-xs text-muted-foreground">{sub}</span>}
      </div>
    </div>
  )
}
