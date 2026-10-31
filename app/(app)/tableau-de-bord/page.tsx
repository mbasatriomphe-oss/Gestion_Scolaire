'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { ArrowRight, CalendarCheck, GraduationCap, TrendingUp, Users, Wallet } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Panel } from '@/components/app/panel'
import { PersonCell } from '@/components/app/person-cell'
import { StatCard } from '@/components/app/stat-card'
import { StatusBadge } from '@/components/app/status-badge'
import { AttendanceChart, DonutChart, FinanceChart, LevelChart } from '@/components/dashboard/charts'
import { fmtGrade, studentSemesterAverages } from '@/lib/academics'
import { formatCompactMoney, formatDate, formatMoney, timeAgo } from '@/lib/format'
import { ROLE_LABELS } from '@/lib/permissions'
import { LEVELS } from '@/lib/seed'
import { useCurrentUser, useDB } from '@/lib/store'

const MONTHS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc']

export default function DashboardPage() {
  const data = useDB()!
  const user = useCurrentUser()!

  const stats = useMemo(() => {
    const classById = new Map(data.classes.map((c) => [c.id, c]))
    const activeStudents = data.students.filter((s) => s.status === 'actif')
    const paid = data.payments.filter((p) => p.status === 'payé')
    const revenue = paid.reduce((a, p) => a + p.amount, 0)
    const expenses = data.expenses.reduce((a, e) => a + e.amount, 0)
    const expectedTuition = activeStudents.reduce((a, s) => a + ((classById.get(s.classId)?.annualTuition ?? data.settings.tuitionByLevel[classById.get(s.classId)?.level ?? ''] ?? 0)), 0)
    const tuitionPaid = paid.filter((p) => p.category === 'Scolarité').reduce((a, p) => a + p.amount, 0)
    const recoveryRate = expectedTuition ? Math.min(100, (tuitionPaid / expectedTuition) * 100) : 0

    const byDate = new Map<string, { present: number; total: number }>()
    for (const a of data.attendance) {
      const entry = byDate.get(a.date) ?? { present: 0, total: 0 }
      entry.total++
      if (a.status === 'présent' || a.status === 'retard') entry.present++
      byDate.set(a.date, entry)
    }
    const attendanceSeries = [...byDate.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-10)
      .map(([date, v]) => ({ day: formatDate(date, { day: '2-digit', month: 'short' }), taux: Number(((v.present / v.total) * 100).toFixed(1)) }))
    const lastRate = attendanceSeries.at(-1)?.taux ?? 0
    const prevRate = attendanceSeries.at(-2)?.taux ?? lastRate

    const now = new Date()
    const finance = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      return {
        month: MONTHS[d.getMonth()],
        recettes: paid.filter((p) => p.date.startsWith(key)).reduce((a, p) => a + p.amount, 0),
        depenses: data.expenses.filter((e) => e.date.startsWith(key)).reduce((a, e) => a + e.amount, 0),
      }
    })
    const lastMonth = finance.at(-1)!.recettes
    const prevMonth = finance.at(-2)!.recettes || 1

    const levels = LEVELS.map((level) => {
      const st = activeStudents.filter((s) => classById.get(s.classId)?.level === level)
      return { level, garcons: st.filter((s) => s.gender === 'M').length, filles: st.filter((s) => s.gender === 'F').length }
    })

    const methods = ['Mobile Money', 'Espèces', 'Virement', 'Chèque'] as const
    const methodData = methods.map((m, i) => ({ name: m, value: paid.filter((p) => p.method === m).reduce((a, p) => a + p.amount, 0), fill: `var(--chart-${i + 1})` }))

    const classAverages = data.classes
      .map((c) => {
        const rows = studentSemesterAverages(data, c.id, 'S1').map((r) => r.general).filter((v): v is number => v !== null)
        return { klass: c, avg: rows.length ? rows.reduce((a, b) => a + b, 0) / rows.length : null, size: data.students.filter((s) => s.classId === c.id).length }
      })
      .filter((c) => c.avg !== null)
      .sort((a, b) => b.avg! - a.avg!)

    return {
      activeStudents: activeStudents.length,
      girls: activeStudents.filter((s) => s.gender === 'F').length,
      teachers: data.teachers.filter((t) => t.status === 'actif').length,
      revenue,
      expenses,
      recoveryRate,
      tuitionPaid,
      expectedTuition,
      attendanceSeries,
      lastRate,
      rateTrend: Number((lastRate - prevRate).toFixed(1)),
      finance,
      revenueTrend: Number((((lastMonth - prevMonth) / prevMonth) * 100).toFixed(1)),
      levels,
      methodData,
      classAverages,
      recentPayments: [...data.payments].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6),
      pendingEnrollments: data.enrollments.filter((e) => e.status === 'en attente').length,
    }
  }, [data])

  const studentById = new Map(data.students.map((s) => [s.id, s]))
  const firstName = user.name.split(' ')[0]
  const hour = new Date().getHours()

  return (
    <>
      <div className="relative overflow-hidden rounded-3xl bg-primary px-6 py-7 text-primary-foreground shadow-lg sm:px-8 dark:bg-sidebar">
        <div aria-hidden="true" className="absolute -top-24 -right-16 size-72 rounded-full bg-gold/20 blur-3xl" />
        <div aria-hidden="true" className="absolute -bottom-32 left-1/3 size-72 rounded-full bg-chart-1/30 blur-3xl" />
        <div className="relative flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold tracking-[0.2em] text-gold uppercase">{ROLE_LABELS[user.role]} · {data.settings.schoolYear}</p>
            <h1 className="mt-2 font-serif text-3xl font-semibold text-balance sm:text-4xl">
              {hour < 18 ? 'Bonjour' : 'Bonsoir'}, {firstName}
            </h1>
            <p className="mt-2 max-w-xl text-sm text-primary-foreground/70">
              Voici l&apos;essentiel de {data.settings.schoolName} aujourd&apos;hui. {stats.pendingEnrollments} inscription(s) attendent une validation.
            </p>
          </div>
          <div className="flex gap-2">
            <Button nativeButton={false} variant="secondary" render={<Link href="/rapports" />}>
              Voir les rapports
              <ArrowRight />
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Élèves actifs" value={stats.activeStudents.toLocaleString('fr-FR')} icon={GraduationCap} hint={`${stats.girls} filles · ${stats.activeStudents - stats.girls} garçons`} tone="navy" />
        <StatCard label="Enseignants" value={String(stats.teachers)} icon={Users} hint={`${data.classes.length} classes · ${data.courses.length} matières`} tone="gold" delay={80} />
        <StatCard label="Recettes encaissées" value={formatCompactMoney(stats.revenue, data.settings.currency)} icon={Wallet} trend={stats.revenueTrend} hint="vs mois précédent" tone="success" delay={160} />
        <StatCard label="Taux de présence" value={`${stats.lastRate.toFixed(1)} %`} icon={CalendarCheck} trend={stats.rateTrend} hint="dernier jour pointé" tone="danger" delay={240} />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Panel title="Recettes & dépenses" description={`Six derniers mois · ${data.settings.currency}`} className="xl:col-span-2" delay={100}>
          <FinanceChart data={stats.finance} currency={data.settings.currency} />
        </Panel>
        <Panel title="Recouvrement scolarité" description="Montant perçu sur le total attendu" delay={150}>
          <DonutChart
            data={[
              { name: 'Perçu', value: stats.tuitionPaid, fill: 'var(--chart-2)' },
              { name: 'Reste à percevoir', value: Math.max(0, stats.expectedTuition - stats.tuitionPaid), fill: 'var(--muted)' },
            ]}
            config={{ Perçu: { label: 'Perçu' }, 'Reste à percevoir': { label: 'Reste à percevoir' } }}
            centerValue={`${stats.recoveryRate.toFixed(0)} %`}
            centerLabel="recouvré"
          />
          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl bg-muted/60 p-3">
              <dt className="text-xs text-muted-foreground">Perçu</dt>
              <dd className="mt-0.5 font-semibold tabular-nums">{formatCompactMoney(stats.tuitionPaid, data.settings.currency)}</dd>
            </div>
            <div className="rounded-xl bg-muted/60 p-3">
              <dt className="text-xs text-muted-foreground">Attendu</dt>
              <dd className="mt-0.5 font-semibold tabular-nums">{formatCompactMoney(stats.expectedTuition, data.settings.currency)}</dd>
            </div>
          </dl>
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <Panel title="Effectifs par niveau" description="Répartition garçons / filles" delay={100}>
          <LevelChart data={stats.levels} />
        </Panel>
        <Panel title="Assiduité" description="Taux de présence des 10 derniers jours" delay={150}>
          <AttendanceChart data={stats.attendanceSeries} />
        </Panel>
        <Panel title="Résultats par classe" description="Moyenne générale · 1er semestre" className="lg:col-span-2 xl:col-span-1" delay={200} action={<TrendingUp className="size-4 text-gold" />}>
          <ul className="flex flex-col gap-3">
            {stats.classAverages.slice(0, 6).map((c, i) => (
              <li key={c.klass.id} className="flex items-center gap-3">
                <span className={`flex size-7 items-center justify-center rounded-lg text-xs font-bold ${i === 0 ? 'bg-gold text-gold-foreground' : 'bg-muted text-muted-foreground'}`}>{i + 1}</span>
                <div className="flex flex-1 flex-col gap-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{c.klass.name}</span>
                    <span className="font-mono text-xs tabular-nums">{fmtGrade(c.avg)} / 20</span>
                  </div>
                  <Progress value={(c.avg! / 20) * 100} className="h-1.5" />
                </div>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Panel
          title="Derniers paiements"
          description="Transactions les plus récentes"
          className="xl:col-span-2"
          delay={100}
          action={
            <Button nativeButton={false} variant="ghost" size="sm" render={<Link href="/frais" />}>
              Tout voir <ArrowRight />
            </Button>
          }
        >
          <ul className="divide-y">
            {stats.recentPayments.map((p) => {
              const s = studentById.get(p.studentId)
              return (
                <li key={p.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0 flex-1">
                    <PersonCell name={s ? `${s.firstName} ${s.lastName}` : 'Élève supprimé'} sub={`${p.category} · ${p.method} · ${formatDate(p.date)}`} />
                  </div>
                  <StatusBadge status={p.status} className="hidden sm:inline-flex" />
                  <span className="w-28 text-right text-sm font-semibold tabular-nums">{formatMoney(p.amount, data.settings.currency)}</span>
                </li>
              )
            })}
          </ul>
        </Panel>
        <div className="flex flex-col gap-4">
          <Panel title="Moyens de paiement" description="Volume encaissé" delay={150}>
            <ul className="flex flex-col gap-3">
              {stats.methodData.map((m) => (
                <li key={m.name} className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <span className="size-2.5 rounded-full" style={{ background: m.fill }} />
                      {m.name}
                    </span>
                    <span className="font-medium tabular-nums">{formatCompactMoney(m.value, data.settings.currency)}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${stats.revenue ? (m.value / stats.revenue) * 100 : 0}%`, background: m.fill }} />
                  </div>
                </li>
              ))}
            </ul>
          </Panel>
          <Panel title="Activité récente" description="Dernières notifications enregistrées" delay={200}>
            <ul className="flex flex-col gap-3">
              {data.notifications.slice(0, 4).map((n) => (
                <li key={n.id} className="flex gap-3 animate-in fade-in slide-in-from-right-2">
                  <span className="relative mt-1.5 flex size-2 shrink-0">
                    <span className={`relative size-2 rounded-full ${n.read ? 'bg-muted-foreground/40' : 'bg-gold'}`} />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{n.title}</p>
                    <p className="text-xs text-muted-foreground">{timeAgo(n.createdAt)}</p>
                  </div>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>
    </>
  )
}
