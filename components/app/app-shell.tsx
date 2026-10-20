'use client'

import { Suspense, useEffect, useState, type ReactNode } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Loader2, Lock } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { useRealtimeSimulation } from '@/hooks/use-realtime-simulation'
import { canAccess, moduleFromPath } from '@/lib/permissions'
import { useCurrentUser, useDB } from '@/lib/store'
import { AppSidebar } from './app-sidebar'
import { Topbar } from './topbar'

export function AppShell({ children }: { children: ReactNode }) {
  const data = useDB()
  const user = useCurrentUser()
  const router = useRouter()
  const pathname = usePathname()
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => setHydrated(true), [])
  useEffect(() => {
    if (hydrated && data && !user) router.replace('/')
  }, [hydrated, data, user, router])

  useRealtimeSimulation(Boolean(user))

  if (!hydrated || !data || !user) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background">
        <Loader2 className="size-6 animate-spin text-gold" aria-label="Chargement" />
      </div>
    )
  }

  const moduleKey = moduleFromPath(pathname)
  const allowed = !moduleKey || canAccess(user.role, moduleKey)

  return (
    <div className="min-h-svh bg-background">
      <AppSidebar role={user.role} />
      <div className="flex min-h-svh flex-col lg:pl-64">
        <Topbar user={user} />
        <main key={pathname} className="mx-auto flex w-full max-w-[1400px] flex-1 flex-col gap-6 p-4 animate-in fade-in slide-in-from-bottom-2 duration-500 sm:p-6 lg:p-8">
          {allowed ? (
            <Suspense fallback={<Loader2 className="mx-auto mt-24 size-6 animate-spin text-gold" aria-label="Chargement" />}>{children}</Suspense>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 py-24 text-center">
              <span className="flex size-14 items-center justify-center rounded-2xl bg-gold/15 text-gold">
                <Lock className="size-6" />
              </span>
              <h1 className="font-serif text-2xl font-semibold">Accès restreint</h1>
              <p className="max-w-sm text-sm text-muted-foreground">Votre rôle ne vous permet pas d&apos;accéder à ce module. Contactez un administrateur si nécessaire.</p>
              <Button nativeButton={false} render={<Link href="/tableau-de-bord" />}>Retour au tableau de bord</Button>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
