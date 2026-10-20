'use client'

import { useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { LogOut, Menu, Moon, RotateCcw, Sun, UserRound } from 'lucide-react'
import { useTheme } from 'next-themes'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { ALL_NAV, ROLE_LABELS } from '@/lib/permissions'
import { db } from '@/lib/store'
import type { AppUser } from '@/lib/types'
import { SidebarNav } from './app-sidebar'
import { CommandSearch } from './command-search'
import { ConfirmDialog } from './confirm-dialog'
import { NotificationsMenu } from './notifications-menu'
import { Avatar } from './person-cell'

export function Topbar({ user }: { user: AppUser }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [resetOpen, setResetOpen] = useState(false)
  const { resolvedTheme, setTheme } = useTheme()
  const pathname = usePathname()
  const router = useRouter()
  const current = ALL_NAV.find((n) => pathname.startsWith(n.href))

  return (
    <header className="no-print sticky top-0 z-20 flex h-16 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur-xl sm:px-6 lg:px-8">
      <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Ouvrir le menu">
        <Menu />
      </Button>
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-72 border-0 p-0">
          <SheetTitle className="sr-only">Menu de navigation</SheetTitle>
          <SidebarNav role={user.role} onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="hidden min-w-0 flex-col md:flex">
        <span className="text-[11px] tracking-wide text-muted-foreground">Scolaris</span>
        <span className="truncate text-sm font-semibold">{current?.label ?? 'Espace'}</span>
      </div>

      <div className="ml-auto flex items-center gap-1 sm:gap-2">
        <CommandSearch role={user.role} />
        <Button variant="ghost" size="icon" onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')} aria-label="Basculer le thème">
          <Sun className="hidden dark:block" />
          <Moon className="dark:hidden" />
        </Button>
        <NotificationsMenu />
        <DropdownMenu>
          <DropdownMenuTrigger render={<button type="button" className="ml-1 flex items-center gap-2.5 rounded-full py-1 pr-1 pl-1 transition-colors hover:bg-muted sm:pr-3" aria-label="Menu utilisateur" />}>
            <Avatar name={user.name} className="size-8 ring-2 ring-gold/40" />
            <span className="hidden flex-col text-left leading-tight sm:flex">
              <span className="text-sm font-semibold">{user.name}</span>
              <span className="text-[11px] text-muted-foreground">{ROLE_LABELS[user.role]}</span>
            </span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuGroup>
              <DropdownMenuLabel>
                <span className="block text-sm font-semibold text-foreground">{user.name}</span>
                <span className="block text-xs font-normal">{user.email}</span>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => toast.info(`Connecté en tant que ${ROLE_LABELS[user.role]}`)}>
              <UserRound />
              Mon profil
            </DropdownMenuItem>
            {user.role === 'admin' && (
              <DropdownMenuItem onClick={() => setResetOpen(true)}>
                <RotateCcw />
                Réinitialiser les données
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onClick={() => {
                db.logout()
                router.replace('/')
                toast.success('Vous êtes déconnecté.')
              }}
            >
              <LogOut />
              Se déconnecter
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <ConfirmDialog
        open={resetOpen}
        onOpenChange={setResetOpen}
        title="Réinitialiser les données ?"
        description="Toutes les modifications locales seront remplacées par le jeu de données de démonstration. Cette action est irréversible."
        confirmLabel="Réinitialiser"
        onConfirm={() => {
          db.reset()
          toast.success('Données de démonstration restaurées.')
        }}
      />
    </header>
  )
}
