'use client'

import { useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Briefcase, Download, Mail, Phone, Plus, Users } from 'lucide-react'
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
import { downloadCSV, formatCompactMoney, formatDate, formatMoney } from '@/lib/format'
import { db, useDB } from '@/lib/store'
import type { Teacher } from '@/lib/types'

export default function TeachersPage() {
  const q = useSearchParams().get('q') ?? ''
  return <TeachersView key={q} initialQuery={q} />
}

function TeachersView({ initialQuery }: { initialQuery: string }) {
  const data = useDB()!
  const editable = useCanEdit('enseignants')
  const crud = useCrudState<Teacher>()
  const [search, setSearch] = useState(initialQuery)
  const [status, setStatus] = useState('all')
  const [specialty, setSpecialty] = useState('all')

  const specialties = useMemo(() => [...new Set(data.teachers.map((t) => t.specialty))].sort(), [data.teachers])
  const courseCount = useMemo(() => {
    const m = new Map<string, number>()
    for (const c of data.courses) m.set(c.teacherId, (m.get(c.teacherId) ?? 0) + c.hoursPerWeek)
    return m
  }, [data.courses])

  const rows = data.teachers.filter((t) => (status === 'all' || t.status === status) && (specialty === 'all' || t.specialty === specialty) && matches(search, t.firstName, t.lastName, t.email, t.specialty, t.phone))

  const columns: Column<Teacher>[] = [
    { key: 'name', header: 'Enseignant', sortValue: (t) => `${t.lastName} ${t.firstName}`, cell: (t) => <PersonCell name={`${t.firstName} ${t.lastName}`} sub={t.specialty} /> },
    {
      key: 'contact',
      header: 'Contact',
      headClassName: 'hidden md:table-cell',
      className: 'hidden md:table-cell',
      cell: (t) => (
        <div className="flex flex-col gap-0.5 text-xs">
          <span className="flex items-center gap-1.5"><Mail className="size-3 text-muted-foreground" />{t.email}</span>
          <span className="flex items-center gap-1.5 text-muted-foreground"><Phone className="size-3" />{t.phone}</span>
        </div>
      ),
    },
    { key: 'hours', header: 'Heures / sem.', headClassName: 'hidden lg:table-cell', className: 'hidden lg:table-cell tabular-nums', sortValue: (t) => courseCount.get(t.id) ?? 0, cell: (t) => `${courseCount.get(t.id) ?? 0} h` },
    { key: 'hired', header: 'Embauche', headClassName: 'hidden lg:table-cell', className: 'hidden lg:table-cell text-muted-foreground', sortValue: (t) => t.hiredAt, cell: (t) => formatDate(t.hiredAt) },
    { key: 'salary', header: 'Salaire', headClassName: 'hidden xl:table-cell', className: 'hidden xl:table-cell tabular-nums', sortValue: (t) => t.salary, cell: (t) => formatMoney(t.salary) },
    { key: 'status', header: 'Statut', sortValue: (t) => t.status, cell: (t) => <StatusBadge status={t.status} /> },
    { key: 'actions', header: '', className: 'w-12', cell: (t) => <RowActions onEdit={editable ? () => crud.openEdit(t) : undefined} onDelete={editable ? () => crud.setDeleting(t) : undefined} /> },
  ]

  const fields: FieldConfig[] = [
    { name: 'firstName', label: 'Prénom', required: true },
    { name: 'lastName', label: 'Nom', required: true },
    { name: 'gender', label: 'Sexe', type: 'select', required: true, options: [{ value: 'F', label: 'Femme' }, { value: 'M', label: 'Homme' }] },
    { name: 'specialty', label: 'Spécialité', required: true, placeholder: 'Mathématiques' },
    {
      name: 'email',
      label: 'E-mail',
      type: 'email',
      required: true,
      validate: (v) => (data.teachers.some((t) => t.email.toLowerCase() === v.toLowerCase() && t.id !== crud.editing?.id) ? 'Cet e-mail est déjà utilisé.' : undefined),
    },
    { name: 'phone', label: 'Téléphone', type: 'tel', required: true },
    { name: 'hiredAt', label: "Date d'embauche", type: 'date', required: true },
    { name: 'salary', label: 'Salaire mensuel (FCFA)', type: 'number', required: true, min: 50000, max: 5000000, step: 5000 },
    { name: 'status', label: 'Statut', type: 'select', required: true, options: [{ value: 'actif', label: 'Actif' }, { value: 'congé', label: 'En congé' }, { value: 'inactif', label: 'Inactif' }] },
  ]

  const e = crud.editing
  const payroll = data.teachers.filter((t) => t.status !== 'inactif').reduce((a, t) => a + t.salary, 0)

  return (
    <>
      <PageHeader
        eyebrow="Ressources humaines"
        title="Enseignants"
        description="Corps enseignant, spécialités, charges horaires et contrats."
        actions={
          <>
            <Button variant="outline" onClick={() => downloadCSV('enseignants.csv', rows.map((t) => ({ Nom: t.lastName, Prénom: t.firstName, Spécialité: t.specialty, Email: t.email, Téléphone: t.phone, Salaire: t.salary, Statut: t.status })))}>
              <Download />
              Exporter
            </Button>
            {editable && (
              <Button onClick={crud.openCreate}>
                <Plus />
                Nouvel enseignant
              </Button>
            )}
          </>
        }
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Enseignants" value={String(data.teachers.length)} icon={Users} hint={`${data.teachers.filter((t) => t.status === 'actif').length} en activité`} />
        <StatCard label="Spécialités" value={String(specialties.length)} icon={Briefcase} tone="gold" delay={60} />
        <StatCard label="Masse salariale / mois" value={formatCompactMoney(payroll)} icon={Briefcase} tone="success" delay={120} />
      </div>
      <Toolbar search={search} onSearch={setSearch} placeholder="Nom, e-mail, spécialité…">
        <SimpleSelect ariaLabel="Filtrer par spécialité" value={specialty} onValueChange={setSpecialty} options={[{ value: 'all', label: 'Toutes spécialités' }, ...specialties.map((s) => ({ value: s, label: s }))]} />
        <SimpleSelect ariaLabel="Filtrer par statut" value={status} onValueChange={setStatus} options={[{ value: 'all', label: 'Tous les statuts' }, { value: 'actif', label: 'Actif' }, { value: 'congé', label: 'En congé' }, { value: 'inactif', label: 'Inactif' }]} />
      </Toolbar>
      <DataTable rows={rows} columns={columns} getRowId={(t) => t.id} />
      <EntityFormDialog
        open={crud.formOpen}
        onOpenChange={crud.setFormOpen}
        title={e ? "Modifier l'enseignant" : 'Nouvel enseignant'}
        fields={fields}
        initial={{
          firstName: e?.firstName ?? '',
          lastName: e?.lastName ?? '',
          gender: e?.gender ?? '',
          specialty: e?.specialty ?? '',
          email: e?.email ?? '',
          phone: e?.phone ?? '',
          hiredAt: e?.hiredAt ?? '',
          salary: e ? String(e.salary) : '',
          status: e?.status ?? 'actif',
        }}
        onSubmit={(v) => {
          const payload = { ...v, gender: v.gender as Teacher['gender'], status: v.status as Teacher['status'], salary: Number(v.salary) }
          if (e) {
            db.update('teachers', e.id, payload)
            toast.success('Enseignant mis à jour.')
          } else {
            db.add('teachers', payload as Omit<Teacher, 'id'>)
            toast.success(`${v.firstName} ${v.lastName} a rejoint l'équipe.`)
          }
        }}
      />
      <ConfirmDialog
        open={Boolean(crud.deleting)}
        onOpenChange={(o) => !o && crud.setDeleting(null)}
        description={
          crud.deleting && data.courses.some((c) => c.teacherId === crud.deleting!.id)
            ? `${crud.deleting.firstName} ${crud.deleting.lastName} est assigné(e) à des cours. Ces cours n'auront plus d'enseignant. Continuer ?`
            : `Supprimer ${crud.deleting?.firstName} ${crud.deleting?.lastName} ?`
        }
        onConfirm={() => {
          db.remove('teachers', crud.deleting!.id)
          toast.success('Enseignant supprimé.')
          crud.setDeleting(null)
        }}
      />
    </>
  )
}
