import { GraduationCap } from 'lucide-react'
import { cn } from '@/lib/utils'

export function Logo({ className, subtitle = true }: { className?: string; subtitle?: boolean }) {
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-[oklch(0.82_0.13_85)] to-[oklch(0.68_0.13_70)] text-[oklch(0.2_0.05_262)] shadow-lg shadow-gold/20">
        <GraduationCap className="size-5" aria-hidden="true" />
      </div>
      <div className="flex flex-col leading-tight">
        <span className="font-serif text-xl font-semibold tracking-tight">Scolaris</span>
        {subtitle && <span className="text-[11px] tracking-[0.2em] uppercase opacity-60">Gestion scolaire</span>}
      </div>
    </div>
  )
}
