'use client'

import { useMemo, useState } from 'react'
import { Download, Plus, UserCheck, UserPlus, UserX } from 'lucide-react'
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
import type { Enrollment } from '@/lib/types'

export default function EnrollmentsPage() {
  const data = useDB()!
  const editable = useCanEdit('inscriptions')
  const crud = useCrudState<Enrollment>()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [deleting, setDeleting] = useState<Enrollment | null>(null)
  const studentById = useMemo(() => new Map(data.students.map((student) => [student.id, student])), [data.students])
  const classById = useMemo(() => new Map(data.classes.map((klass) => [klass.id, klass])), [data.classes])
  const studentOptions = data.students.map((student) => ({ value: student.id, label: `${student.firstName} ${student.lastName} · ${student.matricule}` }))
  const classOptions = data.classes.map((klass) => ({ value: klass.id, label: klass.name }))
  const rows = data.enrollments.filter((enrollment) => {
    const student = studentById.get(enrollment.studentId)
    return (statusFilter === 'all' || enrollment.status === statusFilter) && matches(search, student?.firstName, student?.lastName, student?.matricule, classById.get(enrollment.classId)?.name, enrollment.schoolYear, enrollment.type)
  })
  const fields: FieldConfig[] = [
    { name: 'studentId', label: 'Élève', type: 'select', options: studentOptions, required: true },
    { name: 'classId', label: 'Classe', type: 'select', options: classOptions, required: true },
    { name: 'schoolYear', label: 'Année scolaire', required: true },
    { name: 'date', label: 'Date du dossier', type: 'date', required: true },
    { name: 'type', label: 'Type', type: 'select', options: [{ value: 'Nouvelle', label: 'Nouvelle inscription' }, { value: 'Réinscription', label: 'Réinscription' }], required: true },
    { name: 'fee', label: `Frais d'inscription (${data.settings.currency})`, type: 'number', min: 0, required: true },
    { name: 'status', label: 'Décision', type: 'select', options: [{ value: 'en attente', label: 'En attente' }, { value: 'validée', label: 'Validée' }, { value: 'rejetée', label: 'Rejetée' }], required: true },
  ]
  const editing = crud.editing
  const initial = {
    studentId: editing?.studentId ?? '', classId: editing?.classId ?? '', schoolYear: editing?.schoolYear ?? data.settings.schoolYear,
    date: editing?.date ?? todayISO(), type: editing?.type ?? 'Nouvelle', fee: String(editing?.fee ?? 50), status: editing?.status ?? 'en attente',
  }
  const columns: Column<Enrollment>[] = [
    { key: 'student', header: 'Élève', sortValue: (item) => studentById.get(item.studentId)?.lastName ?? '', cell: (item) => {
      const student = studentById.get(item.studentId)
      return <PersonCell name={student ? `${student.firstName} ${student.lastName}` : 'Élève supprimé'} sub={student?.matricule ?? 'Dossier orphelin'} />
    } },
    { key: 'class', header: 'Classe', sortValue: (item) => classById.get(item.classId)?.name ?? '', cell: (item) => classById.get(item.classId)?.name ?? '—' },
    { key: 'year', header: 'Année scolaire', sortValue: (item) => item.schoolYear, cell: (item) => item.schoolYear },
    { key: 'type', header: 'Dossier', cell: (item) => item.type },
    { key: 'date', header: 'Date', sortValue: (item) => item.date, cell: (item) => formatDate(item.date) },
    { key: 'fee', header: 'Frais', sortValue: (item) => item.fee, cell: (item) => <span className="font-medium tabular-nums">{formatMoney(item.fee, data.settings.currency)}</span> },
    { key: 'status', header: 'Décision', sortValue: (item) => item.status, cell: (item) => <StatusBadge status={item.status} /> },
    { key: 'actions', header: '', className: 'w-12', cell: (item) => <RowActions onEdit={editable ? () => crud.openEdit(item) : undefined} onDelete={editable ? () => setDeleting(item) : undefined} /> },
  ]
  const pending = data.enrollments.filter((item) => item.status === 'en attente').length
  const validated = data.enrollments.filter((item) => item.status === 'validée')

  return (
    <>
      <PageHeader eyebrow="Finances" title="Inscriptions" description="Suivez les dossiers, les frais associés et les décisions de validation." actions={
        <>
          <Button variant="outline" onClick={() => { downloadCSV('inscriptions.csv', rows.map((item) => ({ Élève: studentById.get(item.studentId)?.matricule ?? '', Nom: studentById.get(item.studentId)?.lastName ?? '', Prénom: studentById.get(item.studentId)?.firstName ?? '', Classe: classById.get(item.classId)?.name ?? '', Année: item.schoolYear, Type: item.type, Date: item.date, Frais: item.fee, Statut: item.status }))); toast.success(`${rows.length} dossier(s) exporté(s).`) }}><Download />Exporter</Button>
          {editable && <Button onClick={crud.openCreate}><Plus />Nouveau dossier</Button>}
        </>
      } />
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Dossiers" value={String(data.enrollments.length)} icon={UserPlus} />
        <StatCard label="À traiter" value={String(pending)} icon={UserX} tone="gold" delay={60} />
        <StatCard label="Validés · frais associés" value={formatMoney(validated.reduce((sum, item) => sum + item.fee, 0), data.settings.currency)} icon={UserCheck} tone="success" delay={120} />
      </div>
      <Toolbar search={search} onSearch={setSearch} placeholder="Élève, matricule, classe, année…">
        <SimpleSelect ariaLabel="Filtrer par décision" value={statusFilter} onValueChange={setStatusFilter} options={[{ value: 'all', label: 'Toutes les décisions' }, { value: 'en attente', label: 'En attente' }, { value: 'validée', label: 'Validées' }, { value: 'rejetée', label: 'Rejetées' }]} />
      </Toolbar>
      <DataTable rows={rows} columns={columns} getRowId={(item) => item.id} />
      {editable && <EntityFormDialog open={crud.formOpen} onOpenChange={crud.setFormOpen} title={editing ? 'Modifier le dossier' : 'Nouveau dossier'} description="Le dossier est rattaché à un élève et à une classe existants." fields={fields} initial={initial} onSubmit={(values) => {
        const duplicate = data.enrollments.some((item) => item.id !== editing?.id && item.studentId === values.studentId && item.schoolYear === values.schoolYear)
        if (duplicate) return 'Un dossier existe déjà pour cet élève et cette année scolaire.'
        const payload: Omit<Enrollment, 'id'> = {
          studentId: values.studentId, classId: values.classId, schoolYear: values.schoolYear, date: values.date,
          type: values.type as Enrollment['type'], status: values.status as Enrollment['status'], fee: Number(values.fee),
        }
        if (editing) { db.update('enrollments', editing.id, payload); toast.success('Dossier d’inscription mis à jour.') }
        else { db.add('enrollments', payload); toast.success('Dossier d’inscription créé.') }
      }} />}
      <ConfirmDialog open={Boolean(deleting)} onOpenChange={(open) => !open && setDeleting(null)} description="Supprimer ce dossier d’inscription ? Cette action ne supprime pas l’élève ni ses paiements." onConfirm={() => { if (deleting) db.remove('enrollments', deleting.id); setDeleting(null); toast.success('Dossier supprimé.') }} />
    </>
  )
}