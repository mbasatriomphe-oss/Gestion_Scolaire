'use client'

import { useEffect, useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, Eye, EyeOff, Loader2, Lock, Mail } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ROLE_LABELS } from '@/lib/permissions'
import { db, useDB } from '@/lib/store'
import type { Role } from '@/lib/types'
import { cn } from '@/lib/utils'

const DEMO: Array<{ role: Role; email: string; password: string }> = [
  { role: 'admin', email: 'admin@scolaris.edu', password: 'admin123' },
  { role: 'directeur', email: 'directeur@scolaris.edu', password: 'directeur123' },
  { role: 'enseignant', email: 'enseignant@scolaris.edu', password: 'enseignant123' },
  { role: 'comptable', email: 'comptable@scolaris.edu', password: 'comptable123' },
  { role: 'secretaire', email: 'secretaire@scolaris.edu', password: 'secretaire123' },
]

export function LoginForm() {
  const router = useRouter()
  const data = useDB()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (data?.session) router.replace('/tableau-de-bord')
  }, [data?.session, router])

  const submit = (e: FormEvent) => {
    e.preventDefault()
    setError('')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setError('Veuillez saisir une adresse e-mail valide.')
    if (password.length < 6) return setError('Le mot de passe doit contenir au moins 6 caractères.')
    setLoading(true)
    window.setTimeout(() => {
      const result = db.login(email, password)
      if (!result.ok) {
        setLoading(false)
        setError(result.error)
        return
      }
      toast.success(`Bienvenue, ${result.user.name}`)
      router.push('/tableau-de-bord')
    }, 600)
  }

  return (
    <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-3 duration-500">
      <div className="flex flex-col gap-2">
        <h1 className="font-serif text-3xl font-semibold tracking-tight">Connexion</h1>
        <p className="text-sm text-muted-foreground">Accédez à votre espace de gestion scolaire.</p>
      </div>

      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">Adresse e-mail</Label>
          <div className="relative">
            <Mail className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="vous@scolaris.edu" className="h-11 pl-10" />
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password">Mot de passe</Label>
          <div className="relative">
            <Lock className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input id="password" type={show ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="h-11 pr-10 pl-10" />
            <button type="button" onClick={() => setShow((s) => !s)} className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground hover:text-foreground" aria-label={show ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}>
              {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </div>
        {error && (
          <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive animate-in fade-in">
            {error}
          </p>
        )}
        <Button type="submit" disabled={loading} className="h-11 text-sm">
          {loading ? <Loader2 className="animate-spin" /> : null}
          Se connecter
          {!loading && <ArrowRight data-icon="inline-end" />}
        </Button>
      </form>

      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="h-px flex-1 bg-border" />
          Comptes de démonstration
          <span className="h-px flex-1 bg-border" />
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {DEMO.map((d) => (
            <button
              key={d.role}
              type="button"
              onClick={() => {
                setEmail(d.email)
                setPassword(d.password)
                setError('')
              }}
              className={cn(
                'rounded-xl border bg-card px-3 py-2.5 text-left text-xs transition-all hover:-translate-y-0.5 hover:border-gold/60 hover:shadow-sm',
                email === d.email && 'border-gold bg-gold/5 ring-2 ring-gold/20',
              )}
            >
              <span className="block font-semibold text-foreground">{ROLE_LABELS[d.role]}</span>
              <span className="block truncate text-muted-foreground">{d.password}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
