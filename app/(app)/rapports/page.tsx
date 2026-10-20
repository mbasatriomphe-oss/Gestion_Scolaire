'use client'

import { useMemo, useState } from 'react'
import { Download, ArrowDownRight, ArrowUpRight, Banknote, CircleDollarSign } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { FinanceChart } from '@/components/dashboard/charts'
import { PageHeader } from '@/components/app/page-header'
import { Panel } from '@/components/app/panel'
import { SimpleSelect } from '@/components/app/simple-select'
import { StatCard } from '@/components/app/stat-card'
import { downloadCSV, formatMoney } from '@/lib/format'
import { useDB } from '@/lib/store'

export default function ReportsPage() {
  const data = useDB()!
  const availableYears = useMemo(() => Array.from(new Set([...data.payments.map((item) => item.date.slice(0, 4)), ...data.expenses.map((item) => item.date.slice(0, 4)), String(new Date().getFullYear())])).sort().reverse(), [data.payments, data.expenses])
  const [year, setYear] = useState(String(new Date().getFullYear()))
  const yearPayments = data.payments.filter((item) => item.date.startsWith(year))
  const yearExpenses = data.expenses.filter((item) => item.date.startsWith(year))
  const paidPayments = yearPayments.filter((item) => item.status === 'payé')
  const paidExpenses = yearExpenses.filter((item) => item.status === 'payée')
  const receipts = paidPayments.reduce((sum, item) => sum + item.amount, 0)
  const expenses = paidExpenses.reduce((sum, item) => sum + item.amount, 0)
  const pendingPayments = yearPayments.filter((item) => item.status === 'en attente')
  const pendingExpenses = yearExpenses.filter((item) => item.status === 'en attente')
  const pendingCount = pendingPayments.length + pendingExpenses.length
  const pendingAmount = pendingPayments.reduce((sum, item) => sum + item.amount, 0) + pendingExpenses.reduce((sum, item) => sum + item.amount, 0)
  const monthlyData = Array.from({ length: 12 }, (_, index) => {
    const key = `${year}-${String(index + 1).padStart(2, '0')}`
    const monthPayments = paidPayments.filter((item) => item.date.startsWith(key)).reduce((sum, item) => sum + item.amount, 0)
    const monthExpenses = paidExpenses.filter((item) => item.date.startsWith(key)).reduce((sum, item) => sum + item.amount, 0)
    return { month: new Intl.DateTimeFormat('fr-FR', { month: 'short' }).format(new Date(Number(year), index, 1)), recettes: monthPayments, depenses: monthExpenses }
  })
  const paymentCategories = ['Scolarité', 'Inscription', 'Cantine', 'Transport', 'Tenue'].map((category) => ({ category, amount: paidPayments.filter((item) => item.category === category).reduce((sum, item) => sum + item.amount, 0) })).filter((item) => item.amount > 0).sort((a, b) => b.amount - a.amount)
  const expenseCategories = Array.from(new Set(data.expenses.map((item) => item.category))).map((category) => ({ category, amount: paidExpenses.filter((item) => item.category === category).reduce((sum, item) => sum + item.amount, 0) })).filter((item) => item.amount > 0).sort((a, b) => b.amount - a.amount)
  const transactions = [
    ...yearPayments.map((item) => ({ Date: item.date, Type: 'Recette', Libellé: `${item.category} · ${item.reference}`, Montant: item.amount, Statut: item.status })),
    ...yearExpenses.map((item) => ({ Date: item.date, Type: 'Dépense', Libellé: `${item.category} · ${item.label}`, Montant: item.amount, Statut: item.status })),
  ].sort((a, b) => a.Date.localeCompare(b.Date))

  return (
    <>
      <PageHeader eyebrow="Finances" title="Rapports financiers" description="Synthèse des encaissements, dépenses et opérations en attente." actions={
        <>
          <SimpleSelect ariaLabel="Année du rapport" value={year} onValueChange={setYear} options={availableYears.map((value) => ({ value, label: value }))} />
          <Button variant="outline" onClick={() => { downloadCSV(`rapport-financier-${year}.csv`, transactions); if (transactions.length) toast.success('Rapport exporté.'); else toast.info('Aucune opération à exporter pour cette année.') }}><Download />Exporter le rapport</Button>
        </>
      } />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Recettes encaissées" value={formatMoney(receipts)} icon={ArrowDownRight} tone="success" />
        <StatCard label="Dépenses réglées" value={formatMoney(expenses)} icon={ArrowUpRight} tone="danger" delay={60} />
        <StatCard label="Solde net" value={formatMoney(receipts - expenses)} icon={CircleDollarSign} tone={receipts >= expenses ? 'success' : 'danger'} delay={120} />
        <StatCard label="En attente" value={formatMoney(pendingAmount)} icon={Banknote} hint={`${pendingCount} opération(s)`} tone="gold" delay={180} />
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        <Panel title="Évolution mensuelle" description={`Opérations réglées en ${year}`} className="xl:col-span-2"><FinanceChart data={monthlyData} /></Panel>
        <Panel title="À surveiller" description="Opérations non réglées sur la période">
          <div className="flex flex-col gap-4">
            <div className="flex items-end justify-between border-b pb-3"><span className="text-sm text-muted-foreground">Paiements élèves</span><span className="font-semibold tabular-nums">{formatMoney(pendingPayments.reduce((sum, item) => sum + item.amount, 0))}</span></div>
            <div className="flex items-end justify-between border-b pb-3"><span className="text-sm text-muted-foreground">Dépenses à régler</span><span className="font-semibold tabular-nums">{formatMoney(pendingExpenses.reduce((sum, item) => sum + item.amount, 0))}</span></div>
            <p className="text-xs text-muted-foreground">Les opérations annulées ne sont pas comptées dans les recettes ou dépenses réglées.</p>
          </div>
        </Panel>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Recettes par nature" description={`Encaissements confirmés · ${year}`}><CategoryBreakdown items={paymentCategories} /></Panel>
        <Panel title="Dépenses par catégorie" description={`Dépenses réglées · ${year}`}><CategoryBreakdown items={expenseCategories} /></Panel>
      </div>
      <Panel title="Période couverte" description={`${transactions.length} opération(s) enregistrée(s) en ${year}`}>
        <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <div><p className="text-xs text-muted-foreground">Paiements</p><p className="mt-1 font-semibold">{yearPayments.length}</p></div>
          <div><p className="text-xs text-muted-foreground">Dépenses</p><p className="mt-1 font-semibold">{yearExpenses.length}</p></div>
          <div><p className="text-xs text-muted-foreground">Recettes réglées</p><p className="mt-1 font-semibold">{formatMoney(receipts)}</p></div>
          <div><p className="text-xs text-muted-foreground">Dépenses réglées</p><p className="mt-1 font-semibold">{formatMoney(expenses)}</p></div>
        </div>
      </Panel>
    </>
  )
}

function CategoryBreakdown({ items }: { items: Array<{ category: string; amount: number }> }) {
  const maximum = Math.max(1, ...items.map((item) => item.amount))
  if (!items.length) return <p className="py-8 text-center text-sm text-muted-foreground">Aucune opération réglée sur cette période.</p>
  return (
    <ul className="flex flex-col gap-4">
      {items.map((item) => (
        <li key={item.category}>
          <div className="mb-1.5 flex items-center justify-between gap-3 text-sm"><span>{item.category}</span><span className="font-medium tabular-nums">{formatMoney(item.amount)}</span></div>
          <div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-chart-2" style={{ width: `${(item.amount / maximum) * 100}%` }} /></div>
        </li>
      ))}
    </ul>
  )
}