'use client'

import { Suspense, useEffect, useState, type ReactNode } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Loader2, Lock } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { ApiError, clearAuthToken, getApiErrorMessage, getCurrentUser, hasAuthToken } from '@/lib/api'
import { canAccess, moduleFromPath } from '@/lib/permissions'
import { db, useCurrentUser, useDB } from '@/lib/store'
import { AppSidebar } from './app-sidebar'
import { Topbar } from './topbar'

export function AppShell({ children }: { children: ReactNode }) {
  const data = useDB()
  const user = useCurrentUser()
  const router = useRouter()
  const pathname = usePathname()
  const [hydrated, setHydrated] = useState(false)
  const [authChecked, setAuthChecked] = useState(false)
  const [authError, setAuthError] = useState('')
  const [retry, setRetry] = useState(0)

  useEffect(() => setHydrated(true), [])

  useEffect(() => {
    if (!hydrated) return

    let active = true
    setAuthChecked(false)
    setAuthError('')

    if (!hasAuthToken()) {
      db.logout()
      router.replace('/')
      setAuthChecked(true)
      return
    }

    getCurrentUser()
      .then((authenticatedUser) => {
        if (active) db.loginWithUser(authenticatedUser)
      })
      .catch((error: unknown) => {
        if (!active) return
        if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
          clearAuthToken()
          db.logout()
          router.replace('/')
          toast.error(getApiErrorMessage(error))
          return
        }
        setAuthError(getApiErrorMessage(error))
      })
      .finally(() => {
        if (active) setAuthChecked(true)
      })

    return () => {
      active = false
    }
  }, [hydrated, retry, router])

  if (!hydrated || !authChecked || !data || (!user && !authError)) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background">
        <Loader2 className="size-6 animate-spin text-gold" aria-label="Chargement" />
      </div>
    )
  }

  if (authError) {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center gap-4 bg-background p-6 text-center">
        <p role="alert" className="max-w-md text-sm text-destructive">{authError}</p>
        <div className="flex gap-2">
          <Button onClick={() => setRetry((value) => value + 1)}>Réessayer</Button>
          <Button
            variant="outline"
            onClick={() => {
              clearAuthToken()
              db.logout()
              router.replace('/')
            }}
          >
            Retour à la connexion
          </Button>
        </div>
      </div>
    )
  }

  if (!user) return null

  const moduleKey = moduleFromPath(pathname)
  const allowed = moduleKey !== null && canAccess(user.role, moduleKey)

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
