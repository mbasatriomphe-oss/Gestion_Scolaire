'use client'

import { useEffect, useState } from 'react'
import { Download, Plus, Receipt, Tags, Wallet } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { DataTable, type Column } from '@/components/app/data-table'
import { EntityFormDialog, type FieldConfig } from '@/components/app/entity-form-dialog'
import { PageHeader } from '@/components/app/page-header'
import { SimpleSelect } from '@/components/app/simple-select'
import { StatCard } from '@/components/app/stat-card'
import { matches, Toolbar } from '@/components/app/toolbar'
import { useCanEdit } from '@/hooks/use-permission'
import { getApiErrorMessage } from '@/lib/api'
import { createFinanceExpense, loadExpenseDirectory, type FinanceDirectory, type FinanceExpense } from '@/lib/finance-api'
import { downloadCSV, formatDate, formatMoney, todayISO } from '@/lib/format'
import { useCurrentUser } from '@/lib/store'

export default function ExpensesPage() {
  const user = useCurrentUser()
  const editable = useCanEdit('depenses') && (user?.role === 'admin' || user?.role === 'comptable')
  const [directory, setDirectory] = useState<Pick<FinanceDirectory, 'years' | 'expenses'> | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [reload, setReload] = useState(0)
  const [yearId, setYearId] = useState('')
  const [search, setSearch] = useState('')
  const [formOpen, setFormOpen] = useState(false)

  useEffect(() => {
    let active = true
    loadExpenseDirectory()
      .then((loaded) => {
        if (!active) return
        setDirectory(loaded)
        setYearId((current) => current || String(loaded.years.filter((year) => year.etat === 'ouverte').at(-1)?.id_annee ?? loaded.years.at(-1)?.id_annee ?? ''))
        setLoadError('')
      })
      .catch((error: unknown) => { if (active) setLoadError(getApiErrorMessage(error)) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [reload])

  const yearExpenses = directory?.expenses.filter((expense) => String(expense.id_annee) === yearId) ?? []
  const rows = yearExpenses.filter((expense) => matches(search, expense.libelle, expense.categorie, expense.beneficiaire, expense.reference_piece))
  const total = yearExpenses.reduce((sum, expense) => sum + expense.montant, 0)
  const categories = new Set(yearExpenses.map((expense) => expense.categorie)).size
  const fields: FieldConfig[] = [
    { name: 'libelle', label: 'Libellé', required: true, placeholder: 'Achat de cahiers' },
    { name: 'categorie', label: 'Catégorie', required: true, placeholder: 'Fournitures, entretien, salaires…' },
    { name: 'montant', label: 'Montant (USD)', type: 'number', required: true, min: 1, step: 1, validate: (raw) => Number.isInteger(Number(raw)) ? undefined : 'Saisissez un montant entier en dollars US.' },
    { name: 'date_depense', label: 'Date de la dépense', type: 'date', required: true },
    { name: 'beneficiaire', label: 'Bénéficiaire / fournisseur' },
    { name: 'reference_piece', label: 'Référence de la pièce justificative' },
  ]
  const columns: Column<FinanceExpense>[] = [
    { key: 'label', header: 'Dépense', sortValue: (expense) => expense.libelle, cell: (expense) => <div className="flex flex-col"><span className="font-medium">{expense.libelle}</span><span className="text-xs text-muted-foreground">{expense.beneficiaire || '—'}</span></div> },
    { key: 'category', header: 'Catégorie', sortValue: (expense) => expense.categorie, cell: (expense) => expense.categorie },
    { key: 'date', header: 'Date', sortValue: (expense) => expense.date_depense, cell: (expense) => formatDate(expense.date_depense) },
    { key: 'reference', header: 'Pièce', cell: (expense) => expense.reference_piece || '—' },
    { key: 'amount', header: 'Montant', sortValue: (expense) => expense.montant, cell: (expense) => <strong className="tabular-nums">{formatMoney(expense.montant, 'USD')}</strong> },
  ]

  return (
    <>
      <PageHeader
        eyebrow="Comptabilité"
        title="Dépenses"
        description="Enregistrez chaque sortie et suivez les dépenses de l’établissement par année scolaire."
        actions={<>
          <Button variant="outline" onClick={() => downloadCSV('depenses-scolaires.csv', rows.map((expense) => ({
            Libellé: expense.libelle, Catégorie: expense.categorie, Bénéficiaire: expense.beneficiaire ?? '',
            Date: expense.date_depense, Pièce: expense.reference_piece ?? '', Montant_USD: expense.montant,
          })))}><Download />Exporter</Button>
          {editable && <Button onClick={() => setFormOpen(true)} disabled={loading || Boolean(loadError) || !yearId}><Plus />Nouvelle dépense</Button>}
        </>}
      />

      {loading && <p role="status" className="text-sm text-muted-foreground">Chargement des dépenses…</p>}
      {loadError && <div role="alert" className="flex items-center justify-between gap-3 rounded-lg border border-destructive/40 p-3 text-sm text-destructive"><span>{loadError}</span><Button variant="outline" onClick={() => { setLoading(true); setReload((value) => value + 1) }}>Réessayer</Button></div>}
      {!loading && !loadError && directory?.years.length === 0 && <p className="rounded-lg border p-3 text-sm">Créez d’abord une année scolaire pour enregistrer les dépenses.</p>}

      <div className="max-w-sm rounded-2xl border bg-card p-4">
        <label htmlFor="expenses-year" className="mb-1.5 block text-xs font-medium">Année scolaire</label>
        <SimpleSelect id="expenses-year" value={yearId} onValueChange={setYearId} options={directory?.years.map((year) => ({ value: String(year.id_annee), label: year.libelle })) ?? []} />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Total des dépenses" value={formatMoney(total, 'USD')} icon={Wallet} tone="danger" />
        <StatCard label="Mouvements enregistrés" value={String(yearExpenses.length)} icon={Receipt} delay={60} />
        <StatCard label="Catégories utilisées" value={String(categories)} icon={Tags} tone="gold" delay={120} />
      </div>

      <Toolbar search={search} onSearch={setSearch} placeholder="Libellé, bénéficiaire, référence…" />
      <DataTable rows={rows} columns={columns} getRowId={(expense) => String(expense.id_depense)} pageSize={15} />

      {editable && <EntityFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        title="Nouvelle dépense"
        description={`L’écriture sera enregistrée dans l’année ${directory?.years.find((year) => String(year.id_annee) === yearId)?.libelle ?? ''}.`}
        fields={fields}
        initial={{ libelle: '', categorie: '', montant: '', date_depense: todayISO(), beneficiaire: '', reference_piece: '' }}
        onSubmit={async (values) => {
          if (!yearId) return 'Sélectionnez une année scolaire.'
          const created = await createFinanceExpense({
            id_annee: Number(yearId),
            libelle: values.libelle,
            categorie: values.categorie,
            montant: Number(values.montant),
            date_depense: values.date_depense,
            beneficiaire: values.beneficiaire || null,
            reference_piece: values.reference_piece || null,
          })
          setDirectory((current) => current ? { ...current, expenses: [created, ...current.expenses] } : current)
          toast.success('Dépense enregistrée.')
        }}
      />}
    </>
  )
}
