import { cn } from '@/lib/utils'

const STYLES: Record<string, string> = {
  success: 'bg-success/12 text-success ring-success/25',
  warning: 'bg-warning/15 text-[oklch(0.5_0.12_60)] ring-warning/30 dark:text-warning',
  danger: 'bg-destructive/10 text-destructive ring-destructive/25',
  neutral: 'bg-muted text-muted-foreground ring-border',
  navy: 'bg-primary/10 text-primary ring-primary/20',
  gold: 'bg-gold/15 text-[oklch(0.48_0.1_75)] ring-gold/35 dark:text-gold',
}

const STATUS_TONE: Record<string, keyof typeof STYLES> = {
  actif: 'success',
  payé: 'success',
  payée: 'success',
  validée: 'success',
  présent: 'success',
  'en attente': 'warning',
  retard: 'warning',
  congé: 'warning',
  partiel: 'warning',
  suspendu: 'danger',
  rejetée: 'danger',
  annulé: 'danger',
  absent: 'danger',
  inactif: 'neutral',
  excusé: 'navy',
}

export function StatusBadge({ status, tone, className }: { status: string; tone?: keyof typeof STYLES; className?: string }) {
  const t = tone ?? STATUS_TONE[status] ?? 'neutral'
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium capitalize ring-1 ring-inset whitespace-nowrap', STYLES[t], className)}>
      <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
      {status}
    </span>
  )
}
