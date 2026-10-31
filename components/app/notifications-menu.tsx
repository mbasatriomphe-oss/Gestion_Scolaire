'use client'

import { Bell, CalendarX, CheckCheck, ClipboardList, Settings2, UserPlus, Wallet } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { timeAgo } from '@/lib/format'
import { db, useDB } from '@/lib/store'
import type { AppNotification } from '@/lib/types'
import { cn } from '@/lib/utils'

const ICONS: Record<AppNotification['type'], { icon: typeof Bell; className: string }> = {
  paiement: { icon: Wallet, className: 'bg-success/12 text-success' },
  absence: { icon: CalendarX, className: 'bg-destructive/10 text-destructive' },
  inscription: { icon: UserPlus, className: 'bg-gold/15 text-[oklch(0.5_0.1_75)] dark:text-gold' },
  note: { icon: ClipboardList, className: 'bg-primary/10 text-primary' },
  systeme: { icon: Settings2, className: 'bg-muted text-muted-foreground' },
}

export function NotificationsMenu() {
  const data = useDB()
  const notifications = data?.notifications ?? []
  const unread = notifications.filter((n) => !n.read).length

  return (
    <Popover>
      <PopoverTrigger render={<Button variant="ghost" size="icon" className="relative" aria-label={`Notifications (${unread} non lues)`} />}>
        <Bell />
        {unread > 0 && (
          <span className="absolute top-1 right-1 flex size-4 items-center justify-center rounded-full bg-gold text-[9px] font-bold text-gold-foreground">
            <span className="relative">{unread > 9 ? '9+' : unread}</span>
          </span>
        )}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[22rem] gap-0 p-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div>
            <p className="text-sm font-semibold">Notifications</p>
            <p className="text-xs text-muted-foreground">{unread} non lue(s)</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => db.markAllRead()} disabled={!unread}>
            <CheckCheck />
            Tout lire
          </Button>
        </div>
        <ul className="max-h-96 overflow-y-auto">
          {notifications.length === 0 && <li className="px-4 py-10 text-center text-sm text-muted-foreground">Aucune notification</li>}
          {notifications.slice(0, 20).map((n) => {
            const meta = ICONS[n.type]
            return (
              <li key={n.id} className={cn('flex gap-3 border-b px-4 py-3 last:border-0 transition-colors', !n.read && 'bg-gold/5')}>
                <span className={cn('flex size-8 shrink-0 items-center justify-center rounded-lg', meta.className)}>
                  <meta.icon className="size-4" />
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-medium">{n.title}</p>
                    {!n.read && <span className="size-2 shrink-0 rounded-full bg-gold" aria-label="Non lue" />}
                  </div>
                  <p className="line-clamp-2 text-xs text-muted-foreground">{n.message}</p>
                  <p className="text-[11px] text-muted-foreground/80">{timeAgo(n.createdAt)}</p>
                </div>
              </li>
            )
          })}
        </ul>
      </PopoverContent>
    </Popover>
  )
}
