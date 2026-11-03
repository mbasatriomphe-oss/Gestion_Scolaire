'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, BookOpen, GraduationCap, School, Users, Wallet } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Panel } from '@/components/app/panel'
import { StatCard } from '@/components/app/stat-card'
import { FinanceChart } from '@/components/dashboard/charts'
import { getApiErrorMessage } from '@/lib/api'
import { getFinanceSummary, getSchoolSummary, type FinanceSummary, type SchoolSummary } from '@/lib/dashboard-api'
import { formatMoney } from '@/lib/format'
import { ROLE_LABELS } from '@/lib/permissions'
import { useCurrentUser } from '@/lib/store'

export default function DashboardPage() {
  const user = useCurrentUser()
  const [summary, setSummary] = useState<SchoolSummary | null>(null)
  const [finance, setFinance] = useState<FinanceSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reload, setReload] = useState(0)

  useEffect(() => {
    let active = true
    const canSeeFinance = user?.role === 'admin' || user?.role === 'comptable'
    setLoading(true)
    setError('')
    Promise.all([getSchoolSummary(), canSeeFinance ? getFinanceSummary() : Promise.resolve(null)])
      .then(([school, finances]) => {
        if (!active) return
        setSummary(school)
        setFinance(finances)
      })
      .catch((reason: unknown) => {
        if (active) setError(getApiErrorMessage(reason))
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [user?.role, reload])

  const financeSeries = finance?.mensuel.map((item) => ({
    month: new Intl.DateTimeFormat('fr-FR', { month: 'short' }).format(new Date(`${item.mois}-01T12:00:00`)),
    recettes: item.encaisse,
    depenses: item.depenses,
  })) ?? []
  const hour = new Date().getHours()
  const firstName = user?.name.split(' ')[0] ?? ''

  return (
    <>
      <div className="relative overflow-hidden rounded-3xl bg-primary px-6 py-7 text-primary-foreground shadow-lg sm:px-8 dark:bg-sidebar">
        <div aria-hidden="true" className="absolute -top-24 -right-16 size-72 rounded-full bg-gold/20 blur-3xl" />
        <div className="relative flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold tracking-[0.2em] text-gold uppercase">
              {user ? ROLE_LABELS[user.role] : 'Scolaris'} · {summary?.annee?.libelle ?? 'Aucune année scolaire'}
            </p>
            <h1 className="mt-2 font-serif text-3xl font-semibold sm:text-4xl">
              {hour < 18 ? 'Bonjour' : 'Bonsoir'}, {firstName}
            </h1>
            <p className="mt-2 text-sm text-primary-foreground/70">{user?.role === 'enseignant' ? 'Retrouvez vos classes, vos cours et les élèves qui vous sont affectés.' : 'Les chiffres affichés proviennent des dossiers enregistrés dans la base de l’établissement.'}</p>
          </div>
          {user?.role === 'admin' && (
            <Button nativeButton={false} variant="secondary" render={<Link href="/annees-scolaires" />}>
              Gérer l’année scolaire <ArrowRight />
            </Button>
          )}
          {user?.role === 'enseignant' && (
            <Button nativeButton={false} variant="secondary" render={<Link href="/notes" />}>
              Saisir les cotes <ArrowRight />
            </Button>
          )}
          {user?.role === 'comptable' && (
            <Button nativeButton={false} variant="secondary" render={<Link href="/frais" />}>
              Enregistrer un paiement <ArrowRight />
            </Button>
          )}
        </div>
      </div>

      {loading && <p role="status" className="text-sm text-muted-foreground">Chargement des chiffres de l’établissement…</p>}
      {error && (
        <div role="alert" className="flex items-center justify-between gap-3 rounded-lg border border-destructive/40 p-4 text-sm text-destructive">
          <span>{error}</span>
          <Button variant="outline" onClick={() => setReload((value) => value + 1)}>Réessayer</Button>
        </div>
      )}

      {summary && !error && (
        <>
          {user?.role === 'enseignant' && <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Mes élèves inscrits" value={String(summary.eleves_inscrits)} icon={GraduationCap} tone="navy" />
            <StatCard label="Mes classes" value={String(summary.classes_actives)} icon={School} tone="gold" delay={80} />
            <StatCard label="Mes cours" value={String(summary.cours_actifs)} icon={BookOpen} delay={160} />
            <StatCard label="Mes affectations" value={String(summary.mes_affectations ?? 0)} icon={BookOpen} tone="success" delay={240} />
          </div>}
          {user?.role === 'admin' && <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Élèves actifs" value={String(summary.eleves_actifs)} icon={GraduationCap} hint={`${summary.eleves_inscrits} inscrits dans l’année`} tone="navy" />
            <StatCard label="Enseignants actifs" value={String(summary.enseignants_actifs)} icon={Users} tone="gold" delay={80} />
            <StatCard label="Classes actives" value={String(summary.classes_actives)} icon={School} delay={160} />
            <StatCard label="Cours actifs" value={String(summary.cours_actifs)} icon={BookOpen} tone="success" delay={240} />
          </div>}

          {finance && (
            <>
              <div className="grid gap-4 sm:grid-cols-3">
                <StatCard label="Frais encaissés" value={formatMoney(finance.total_encaisse, 'USD')} icon={Wallet} tone="success" />
                <StatCard label="Dépenses" value={formatMoney(finance.total_depenses, 'USD')} icon={Wallet} tone="danger" delay={80} />
                <StatCard label="Solde" value={formatMoney(finance.solde, 'USD')} icon={Wallet} tone={finance.solde >= 0 ? 'success' : 'danger'} delay={160} />
              </div>
              <div className="grid gap-4 xl:grid-cols-3">
                <Panel title="Recettes et dépenses" description="Année scolaire · USD" className="xl:col-span-2">
                  <FinanceChart data={financeSeries} currency="USD" />
                </Panel>
                <Panel title="Frais scolaires" description="Suivi par semestre">
                  <div className="space-y-4 text-sm">
                    {finance.semestres.map((semester) => (
                      <div key={semester.id_semestre} className="rounded-xl border p-3">
                        <p className="font-semibold">{semester.libelle}</p>
                        <p className="mt-1 text-muted-foreground">Encaissé : {formatMoney(semester.encaisse, 'USD')}</p>
                        <p className="text-muted-foreground">Reste : {formatMoney(semester.reste_du, 'USD')}</p>
                      </div>
                    ))}
                    {finance.semestres.length === 0 && <p className="text-muted-foreground">Aucun frais défini pour l’année scolaire.</p>}
                    <Button nativeButton={false} variant="outline" render={<Link href="/rapports" />}>Voir le rapport <ArrowRight /></Button>
                  </div>
                </Panel>
              </div>
            </>
          )}
        </>
      )}
    </>
  )
}
