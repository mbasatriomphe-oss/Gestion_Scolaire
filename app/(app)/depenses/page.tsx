'use client'

import { useState } from 'react'
import { Download, Plus, Clock3, Receipt, Wallet } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/app/confirm-dialog'
import { DataTable, type Column } from '@/components/app/data-table'
import { EntityFormDialog, type FieldConfig } from '@/components/app/entity-form-dialog'
import { PageHeader } from '@/components/app/page-header'
import { RowActions } from '@/components/app/row-actions'
import { SimpleSelect } from '@/components/app/simple-select'
import { StatCard } from '@/components/app/stat-card'
import { StatusBadge } from '@/components/app/status-badge'
import { matches, Toolbar } from '@/components/app/toolbar'
import { useCanEdit } from '@/hooks/use-permission'
import { useCrudState } from '@/hooks/use-crud-state'
import { downloadCSV, formatDate, formatMoney, todayISO } from '@/lib/format'
import { db, useDB } from '@/lib/store'
import type { Expense } from '@/lib/types'

const categories: Expense['category'][] = ['Salaires', 'Fournitures', 'Maintenance', 'Électricité & Eau', 'Transport', 'Événements', 'Autres']
const methods: Expense['method'][] = ['Espèces', 'Mobile Money', 'Virement', 'Chèque']

export default function ExpensesPage() {
  const data = useDB()!
  const editable = useCanEdit('depenses')
  const crud = useCrudState<Expense>()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [deleting, setDeleting] = useState<Expense | null>(null)
  const rows = data.expenses.filter((expense) => (statusFilter === 'all' || expense.status === statusFilter) && (categoryFilter === 'all' || expense.category === categoryFilter) && matches(search, expense.label, expense.category, expense.supplier, expense.method))
  const fields: FieldConfig[] = [
    { name: 'label', label: 'Libellé', required: true },
    { name: 'category', label: 'Catégorie', type: 'select', options: categories.map((value) => ({ value, label: value })), required: true },
    { name: 'amount', label: 'Montant (FCFA)', type: 'number', min: 1, required: true },
    { name: 'date', label: 'Date', type: 'date', required: true },
    { name: 'supplier', label: 'Bénéficiaire / fournisseur', required: true },
    { name: 'method', label: 'Mode de paiement', type: 'select', options: methods.map((value) => ({ value, label: value })), required: true },
    { name: 'status', label: 'Statut', type: 'select', options: [{ value: 'payée', label: 'Payée' }, { value: 'en attente', label: 'En attente' }], required: true },
  ]
  const editing = crud.editing
  const initial = { label: editing?.label ?? '', category: editing?.category ?? 'Fournitures', amount: String(editing?.amount ?? ''), date: editing?.date ?? todayISO(), supplier: editing?.supplier ?? '', method: editing?.method ?? 'Virement', status: editing?.status ?? 'en attente' }
  const columns: Column<Expense>[] = [
    { key: 'label', header: 'Dépense', sortValue: (expense) => expense.label, cell: (expense) => <div className="flex flex-col"><span className="font-medium">{expense.label}</span><span className="text-xs text-muted-foreground">{expense.supplier}</span></div> },
    { key: 'category', header: 'Catégorie', sortValue: (expense) => expense.category, cell: (expense) => expense.category },
    { key: 'date', header: 'Date', sortValue: (expense) => expense.date, cell: (expense) => formatDate(expense.date) },
    { key: 'method', header: 'Mode', headClassName: 'hidden md:table-cell', className: 'hidden md:table-cell', cell: (expense) => expense.method },
    { key: 'amount', header: 'Montant', sortValue: (expense) => expense.amount, cell: (expense) => <span className="font-medium tabular-nums">{formatMoney(expense.amount)}</span> },
    { key: 'status', header: 'Statut', sortValue: (expense) => expense.status, cell: (expense) => <StatusBadge status={expense.status} /> },
    { key: 'actions', header: '', className: 'w-12', cell: (expense) => <RowActions onEdit={editable ? () => crud.openEdit(expense) : undefined} onDelete={editable ? () => setDeleting(expense) : undefined} /> },
  ]
  const paid = data.expenses.filter((expense) => expense.status === 'payée')
  const pending = data.expenses.filter((expense) => expense.status === 'en attente')

  return (
    <>
      <PageHeader eyebrow="Finances" title="Dépenses" description="Consignez les sorties de caisse et suivez les dépenses par catégorie." actions={
        <>
          <Button variant="outline" onClick={() => { downloadCSV('depenses.csv', rows.map((expense) => ({ Libellé: expense.label, Catégorie: expense.category, Bénéficiaire: expense.supplier, Date: expense.date, Mode: expense.method, Montant: expense.amount, Statut: expense.status }))); toast.success(`${rows.length} dépense(s) exportée(s).`) }}><Download />Exporter</Button>
          {editable && <Button onClick={crud.openCreate}><Plus />Nouvelle dépense</Button>}
        </>
      } />
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Dépenses réglées" value={formatMoney(paid.reduce((sum, expense) => sum + expense.amount, 0))} icon={Wallet} tone="danger" />
        <StatCard label="Opérations réglées" value={String(paid.length)} icon={Receipt} delay={60} />
        <StatCard label="À payer" value={formatMoney(pending.reduce((sum, expense) => sum + expense.amount, 0))} icon={Clock3} tone="gold" delay={120} />
      </div>
      <Toolbar search={search} onSearch={setSearch} placeholder="Libellé, catégorie, fournisseur…">
        <SimpleSelect ariaLabel="Filtrer par statut" value={statusFilter} onValueChange={setStatusFilter} options={[{ value: 'all', label: 'Tous les statuts' }, { value: 'payée', label: 'Payées' }, { value: 'en attente', label: 'En attente' }]} />
        <SimpleSelect ariaLabel="Filtrer par catégorie" value={categoryFilter} onValueChange={setCategoryFilter} options={[{ value: 'all', label: 'Toutes les catégories' }, ...categories.map((value) => ({ value, label: value }))]} />
      </Toolbar>
      <DataTable rows={rows} columns={columns} getRowId={(expense) => expense.id} />
      {editable && <EntityFormDialog open={crud.formOpen} onOpenChange={crud.setFormOpen} title={editing ? 'Modifier la dépense' : 'Nouvelle dépense'} fields={fields} initial={initial} onSubmit={(values) => {
        const payload: Omit<Expense, 'id'> = {
          label: values.label, category: values.category as Expense['category'], amount: Number(values.amount), date: values.date,
          supplier: values.supplier, method: values.method as Expense['method'], status: values.status as Expense['status'],
        }
        if (editing) { db.update('expenses', editing.id, payload); toast.success('Dépense mise à jour.') }
        else { db.add('expenses', payload); toast.success('Dépense enregistrée.') }
      }} />}
      <ConfirmDialog open={Boolean(deleting)} onOpenChange={(open) => !open && setDeleting(null)} description={`Supprimer la dépense « ${deleting?.label ?? ''} » ?`} onConfirm={() => { if (deleting) db.remove('expenses', deleting.id); setDeleting(null); toast.success('Dépense supprimée.') }} />
    </>
  )
}