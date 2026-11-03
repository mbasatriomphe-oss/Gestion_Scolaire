'use client'

import { useEffect, useMemo, useState } from 'react'
import { ArrowDownRight, ArrowUpRight, CircleDollarSign, Download, Wallet } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { FinanceChart } from '@/components/dashboard/charts'
import { PageHeader } from '@/components/app/page-header'
import { Panel } from '@/components/app/panel'
import { SimpleSelect } from '@/components/app/simple-select'
import { StatCard } from '@/components/app/stat-card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { getApiErrorMessage } from '@/lib/api'
import { getFinanceSummary, type FinanceSummary } from '@/lib/dashboard-api'
import { downloadCSV, formatDate, formatMoney } from '@/lib/format'
import { listReportYears, loadReportTransactions, type ReportExpense, type ReportPayment, type ReportYear } from '@/lib/report-api'

export default function ReportsPage() {
  const [years, setYears] = useState<ReportYear[]>([])
  const [yearId, setYearId] = useState('')
  const [bilan, setBilan] = useState<FinanceSummary | null>(null)
  const [payments, setPayments] = useState<ReportPayment[]>([])
  const [expenses, setExpenses] = useState<ReportExpense[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reload, setReload] = useState(0)

  useEffect(() => {
    let active = true
    listReportYears()
      .then((records) => {
        if (!active) return
        const ordered = [...records].sort((a, b) =>
          Number(b.etat === 'ouverte') - Number(a.etat === 'ouverte') || b.date_debut.localeCompare(a.date_debut),
        )
        setYears(ordered)
        setYearId((current) => current || String(ordered[0]?.id_annee ?? ''))
        if (ordered.length === 0) setLoading(false)
      })
      .catch((reason: unknown) => {
        if (active) { setError(getApiErrorMessage(reason)); setLoading(false) }
      })
    return () => { active = false }
  }, [reload])

  useEffect(() => {
    if (!yearId) return
    let active = true
    setLoading(true)
    setError('')
    Promise.all([getFinanceSummary(Number(yearId)), loadReportTransactions(Number(yearId))])
      .then(([totals, transactions]) => {
        if (!active) return
        setBilan(totals)
        setPayments(transactions.payments)
        setExpenses(transactions.expenses)
      })
      .catch((reason: unknown) => {
        if (active) setError(getApiErrorMessage(reason))
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [yearId, reload])

  const transactions = useMemo(() => [
    ...payments.map((item) => ({
      id: `p${item.id_paiement}`,
      date: item.date_paiement.slice(0, 10),
      type: 'Recette',
      label: item.reference_recu ?? `Paiement ${item.id_paiement}`,
      amount: Number(item.montant),
    })),
    ...expenses.map((item) => ({
      id: `d${item.id_depense}`,
      date: item.date_depense.slice(0, 10),
      type: 'Dépense',
      label: `${item.categorie} · ${item.libelle}`,
      amount: Number(item.montant),
    })),
  ].sort((a, b) => b.date.localeCompare(a.date)), [payments, expenses])
  const selectedYear = years.find((item) => String(item.id_annee) === yearId)
  const monthly = bilan?.mensuel.map((item) => ({
    month: new Intl.DateTimeFormat('fr-FR', { month: 'short' }).format(new Date(`${item.mois}-01T12:00:00`)),
    recettes: item.encaisse,
    depenses: item.depenses,
  })) ?? []

  return (
    <>
      <PageHeader eyebrow="Finances" title="Rapport financier" description="Encaissements, dépenses et frais scolaires enregistrés dans la base." actions={
        <>
          {years.length > 0 && <SimpleSelect ariaLabel="Année scolaire du rapport" value={yearId} onValueChange={setYearId} options={years.map((item) => ({ value: String(item.id_annee), label: item.libelle }))} />}
          <Button variant="outline" disabled={!transactions.length} onClick={() => {
            downloadCSV(`rapport-financier-${selectedYear?.libelle ?? 'annee'}.csv`, transactions.map((item) => ({ Date: item.date, Type: item.type, Libellé: item.label, Montant: item.amount })))
            toast.success('Rapport exporté.')
          }}><Download />Exporter</Button>
        </>
      } />

      {loading && <p role="status" className="text-sm text-muted-foreground">Chargement du rapport…</p>}
      {error && <div role="alert" className="flex items-center justify-between gap-3 rounded-lg border border-destructive/40 p-4 text-sm text-destructive"><span>{error}</span><Button variant="outline" onClick={() => setReload((value) => value + 1)}>Réessayer</Button></div>}
      {!loading && !error && years.length === 0 && <p className="rounded-lg border p-4 text-sm text-muted-foreground">Créez d’abord une année scolaire pour obtenir un rapport.</p>}

      {bilan && !error && years.length > 0 && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Encaissements" value={formatMoney(bilan.total_encaisse, 'USD')} icon={ArrowDownRight} tone="success" />
            <StatCard label="Dépenses" value={formatMoney(bilan.total_depenses, 'USD')} icon={ArrowUpRight} tone="danger" delay={60} />
            <StatCard label="Solde" value={formatMoney(bilan.solde, 'USD')} icon={CircleDollarSign} tone={bilan.solde >= 0 ? 'success' : 'danger'} delay={120} />
            <StatCard label="Frais restant à percevoir" value={formatMoney(bilan.reste_du, 'USD')} icon={Wallet} tone="gold" delay={180} />
          </div>
          <div className="grid gap-4 xl:grid-cols-3">
            <Panel title="Évolution mensuelle" description={selectedYear?.libelle ?? 'Année scolaire'} className="xl:col-span-2"><FinanceChart data={monthly} currency="USD" /></Panel>
            <Panel title="Scolarité par semestre" description="Frais dus et encaissés">
              <div className="space-y-4 text-sm">
                {bilan.semestres.map((semester) => (
                  <div key={semester.id_semestre} className="rounded-xl border p-3">
                    <p className="font-semibold">{semester.libelle}</p>
                    <p className="mt-1">Dû : {formatMoney(semester.montant_du, 'USD')}</p>
                    <p>Encaissé : {formatMoney(semester.encaisse, 'USD')}</p>
                    <p>Reste : {formatMoney(semester.reste_du, 'USD')}</p>
                  </div>
                ))}
              </div>
            </Panel>
          </div>
          <Panel title="Mouvements" description={`${transactions.length} écriture(s) pour ${selectedYear?.libelle ?? 'l’année'}`}>
            <div className="max-h-96 overflow-auto">
              <Table>
                <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Type</TableHead><TableHead>Référence / libellé</TableHead><TableHead className="text-right">Montant</TableHead></TableRow></TableHeader>
                <TableBody>
                  {transactions.map((item) => <TableRow key={item.id}><TableCell>{formatDate(item.date)}</TableCell><TableCell>{item.type}</TableCell><TableCell>{item.label}</TableCell><TableCell className="text-right tabular-nums">{formatMoney(item.amount, 'USD')}</TableCell></TableRow>)}
                  {transactions.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">Aucun mouvement enregistré.</TableCell></TableRow>}
                </TableBody>
              </Table>
            </div>
          </Panel>
        </>
      )}
    </>
  )
}
