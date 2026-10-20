'use client'

import { useMemo, useState } from 'react'
import { Download, Plus, Receipt, Wallet, Clock3 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/app/confirm-dialog'
import { DataTable, type Column } from '@/components/app/data-table'
import { EntityFormDialog, type FieldConfig } from '@/components/app/entity-form-dialog'
import { PageHeader } from '@/components/app/page-header'
import { PersonCell } from '@/components/app/person-cell'
import { RowActions } from '@/components/app/row-actions'
import { SimpleSelect } from '@/components/app/simple-select'
import { StatCard } from '@/components/app/stat-card'
import { StatusBadge } from '@/components/app/status-badge'
import { matches, Toolbar } from '@/components/app/toolbar'
import { useCanEdit } from '@/hooks/use-permission'
import { useCrudState } from '@/hooks/use-crud-state'
import { downloadCSV, formatDate, formatMoney, todayISO } from '@/lib/format'
import { db, useDB } from '@/lib/store'
import type { Payment } from '@/lib/types'

const categories: Payment['category'][] = ['Scolarité', 'Inscription', 'Cantine', 'Transport', 'Tenue']
const methods: Payment['method'][] = ['Espèces', 'Mobile Money', 'Virement', 'Chèque']

export default function FeesPage() {
  const data = useDB()!
  const editable = useCanEdit('frais')
  const crud = useCrudState<Payment>()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [deleting, setDeleting] = useState<Payment | null>(null)
  const studentById = useMemo(() => new Map(data.students.map((student) => [student.id, student])), [data.students])
  const studentOptions = data.students.map((student) => ({ value: student.id, label: `${student.firstName} ${student.lastName} · ${student.matricule}` }))
  const rows = data.payments.filter((payment) => {
    const student = studentById.get(payment.studentId)
    return (statusFilter === 'all' || payment.status === statusFilter) && (categoryFilter === 'all' || payment.category === categoryFilter) && matches(search, payment.reference, student?.firstName, student?.lastName, student?.matricule, payment.category, payment.method)
  })
  const fields: FieldConfig[] = [
    { name: 'studentId', label: 'Élève', type: 'select', options: studentOptions, required: true },
    { name: 'category', label: 'Nature du frais', type: 'select', options: categories.map((value) => ({ value, label: value })), required: true },
    { name: 'amount', label: 'Montant (FCFA)', type: 'number', min: 1, required: true },
    { name: 'date', label: 'Date du paiement', type: 'date', required: true },
    { name: 'method', label: 'Mode de paiement', type: 'select', options: methods.map((value) => ({ value, label: value })), required: true },
    { name: 'status', label: 'Statut', type: 'select', options: [{ value: 'payé', label: 'Payé' }, { value: 'en attente', label: 'En attente' }, { value: 'annulé', label: 'Annulé' }], required: true },
  ]
  const editing = crud.editing
  const initial = { studentId: editing?.studentId ?? '', category: editing?.category ?? 'Scolarité', amount: String(editing?.amount ?? ''), date: editing?.date ?? todayISO(), method: editing?.method ?? 'Espèces', status: editing?.status ?? 'payé' }
  const columns: Column<Payment>[] = [
    { key: 'reference', header: 'Référence', sortValue: (payment) => payment.reference, cell: (payment) => <span className="font-mono text-xs">{payment.reference}</span> },
    { key: 'student', header: 'Élève', sortValue: (payment) => studentById.get(payment.studentId)?.lastName ?? '', cell: (payment) => { const student = studentById.get(payment.studentId); return <PersonCell name={student ? `${student.firstName} ${student.lastName}` : 'Élève supprimé'} sub={student?.matricule ?? 'Dossier orphelin'} /> } },
    { key: 'category', header: 'Frais', sortValue: (payment) => payment.category, cell: (payment) => payment.category },
    { key: 'date', header: 'Date', sortValue: (payment) => payment.date, cell: (payment) => formatDate(payment.date) },
    { key: 'method', header: 'Mode', headClassName: 'hidden md:table-cell', className: 'hidden md:table-cell', cell: (payment) => payment.method },
    { key: 'amount', header: 'Montant', sortValue: (payment) => payment.amount, cell: (payment) => <span className="font-medium tabular-nums">{formatMoney(payment.amount)}</span> },
    { key: 'status', header: 'Statut', sortValue: (payment) => payment.status, cell: (payment) => <StatusBadge status={payment.status} /> },
    { key: 'actions', header: '', className: 'w-12', cell: (payment) => <RowActions onEdit={editable ? () => crud.openEdit(payment) : undefined} onDelete={editable ? () => setDeleting(payment) : undefined} /> },
  ]
  const paid = data.payments.filter((payment) => payment.status === 'payé')
  const pending = data.payments.filter((payment) => payment.status === 'en attente')

  return (
    <>
      <PageHeader eyebrow="Finances" title="Frais scolaires" description="Enregistrez les règlements et suivez les encaissements par élève." actions={
        <>
          <Button variant="outline" onClick={() => { downloadCSV('frais-scolaires.csv', rows.map((payment) => ({ Référence: payment.reference, Élève: studentById.get(payment.studentId)?.matricule ?? '', Nom: studentById.get(payment.studentId)?.lastName ?? '', Prénom: studentById.get(payment.studentId)?.firstName ?? '', Catégorie: payment.category, Date: payment.date, Mode: payment.method, Montant: payment.amount, Statut: payment.status }))); toast.success(`${rows.length} paiement(s) exporté(s).`) }}><Download />Exporter</Button>
          {editable && <Button onClick={crud.openCreate}><Plus />Enregistrer un paiement</Button>}
        </>
      } />
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Montant encaissé" value={formatMoney(paid.reduce((sum, payment) => sum + payment.amount, 0))} icon={Wallet} tone="success" />
        <StatCard label="Paiements reçus" value={String(paid.length)} icon={Receipt} delay={60} />
        <StatCard label="En attente" value={formatMoney(pending.reduce((sum, payment) => sum + payment.amount, 0))} icon={Clock3} tone="gold" delay={120} />
      </div>
      <Toolbar search={search} onSearch={setSearch} placeholder="Référence, élève, matricule…">
        <SimpleSelect ariaLabel="Filtrer par statut" value={statusFilter} onValueChange={setStatusFilter} options={[{ value: 'all', label: 'Tous les statuts' }, { value: 'payé', label: 'Payés' }, { value: 'en attente', label: 'En attente' }, { value: 'annulé', label: 'Annulés' }]} />
        <SimpleSelect ariaLabel="Filtrer par catégorie" value={categoryFilter} onValueChange={setCategoryFilter} options={[{ value: 'all', label: 'Toutes les catégories' }, ...categories.map((value) => ({ value, label: value }))]} />
      </Toolbar>
      <DataTable rows={rows} columns={columns} getRowId={(payment) => payment.id} />
      {editable && <EntityFormDialog open={crud.formOpen} onOpenChange={crud.setFormOpen} title={editing ? 'Modifier le paiement' : 'Enregistrer un paiement'} description={editing ? `Référence ${editing.reference}` : 'La référence est générée automatiquement.'} fields={fields} initial={initial} onSubmit={(values) => {
        const payload: Omit<Payment, 'id' | 'reference'> = {
          studentId: values.studentId, category: values.category as Payment['category'], amount: Number(values.amount),
          method: values.method as Payment['method'], date: values.date, status: values.status as Payment['status'],
        }
        if (editing) { db.update('payments', editing.id, payload); toast.success('Paiement mis à jour.') }
        else { const next = data.payments.reduce((max, payment) => Math.max(max, Number(payment.reference.split('-').at(-1)) || 0), 0) + 1; db.add('payments', { ...payload, reference: `PAY-${String(next).padStart(5, '0')}` }); toast.success('Paiement enregistré.') }
      }} />}
      <ConfirmDialog open={Boolean(deleting)} onOpenChange={(open) => !open && setDeleting(null)} description={`Supprimer le paiement ${deleting?.reference ?? ''} ?`} onConfirm={() => { if (deleting) db.remove('payments', deleting.id); setDeleting(null); toast.success('Paiement supprimé.') }} />
    </>
  )
}