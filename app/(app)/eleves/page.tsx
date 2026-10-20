'use client'

import { useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Download, Eye, GraduationCap, Plus, UserCheck, UserX, Venus } from 'lucide-react'
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
import { StudentSheet } from '@/components/students/student-sheet'
import { useCanEdit } from '@/hooks/use-permission'
import { useCrudState } from '@/hooks/use-crud-state'
import { downloadCSV, formatDate, todayISO } from '@/lib/format'
import { db, useDB } from '@/lib/store'
import type { Student } from '@/lib/types'

export default function StudentsPage() {
  const q = useSearchParams().get('q') ?? ''
  return <StudentsView key={q} initialQuery={q} />
}

function StudentsView({ initialQuery }: { initialQuery: string }) {
  const data = useDB()!
  const editable = useCanEdit('eleves')
  const crud = useCrudState<Student>()
  const [search, setSearch] = useState(initialQuery)
  const [classFilter, setClassFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [genderFilter, setGenderFilter] = useState('all')
  const [viewing, setViewing] = useState<Student | null>(null)

  const classById = useMemo(() => new Map(data.classes.map((c) => [c.id, c])), [data.classes])
  const classOptions = data.classes.map((c) => ({ value: c.id, label: c.name }))

  const rows = useMemo(
    () =>
      data.students.filter(
        (s) =>
          (classFilter === 'all' || s.classId === classFilter) &&
          (statusFilter === 'all' || s.status === statusFilter) &&
          (genderFilter === 'all' || s.gender === genderFilter) &&
          matches(search, s.firstName, s.lastName, s.matricule, s.parentName, s.parentPhone, classById.get(s.classId)?.name),
      ),
    [data.students, classFilter, statusFilter, genderFilter, search, classById],
  )

  const columns: Column<Student>[] = [
    { key: 'name', header: 'Élève', sortValue: (s) => `${s.lastName} ${s.firstName}`, cell: (s) => <PersonCell name={`${s.firstName} ${s.lastName}`} sub={s.matricule} /> },
    { key: 'class', header: 'Classe', sortValue: (s) => classById.get(s.classId)?.name ?? '', cell: (s) => <span className="font-medium">{classById.get(s.classId)?.name ?? '—'}</span> },
    { key: 'gender', header: 'Sexe', headClassName: 'hidden md:table-cell', className: 'hidden md:table-cell', cell: (s) => (s.gender === 'F' ? 'Fille' : 'Garçon') },
    { key: 'birth', header: 'Naissance', headClassName: 'hidden lg:table-cell', className: 'hidden lg:table-cell text-muted-foreground', sortValue: (s) => s.birthDate, cell: (s) => formatDate(s.birthDate) },
    {
      key: 'parent',
      header: 'Parent / tuteur',
      headClassName: 'hidden xl:table-cell',
      className: 'hidden xl:table-cell',
      cell: (s) => (
        <div className="flex flex-col">
          <span>{s.parentName}</span>
          <span className="text-xs text-muted-foreground">{s.parentPhone}</span>
        </div>
      ),
    },
    { key: 'status', header: 'Statut', sortValue: (s) => s.status, cell: (s) => <StatusBadge status={s.status} /> },
    {
      key: 'actions',
      header: '',
      className: 'w-12',
      cell: (s) => (
        <RowActions
          extra={[{ label: 'Voir la fiche', icon: Eye, onClick: () => setViewing(s) }]}
          onEdit={editable ? () => crud.openEdit(s) : undefined}
          onDelete={editable ? () => crud.setDeleting(s) : undefined}
        />
      ),
    },
  ]

  const fields: FieldConfig[] = [
    { name: 'firstName', label: 'Prénom', required: true, placeholder: 'Aminata' },
    { name: 'lastName', label: 'Nom', required: true, placeholder: 'Diallo' },
    { name: 'gender', label: 'Sexe', type: 'select', required: true, options: [{ value: 'F', label: 'Fille' }, { value: 'M', label: 'Garçon' }] },
    {
      name: 'birthDate',
      label: 'Date de naissance',
      type: 'date',
      required: true,
      validate: (v) => {
        const age = (Date.now() - new Date(v).getTime()) / (365.25 * 864e5)
        return age < 9 || age > 25 ? "L'âge doit être compris entre 9 et 25 ans." : undefined
      },
    },
    {
      name: 'classId',
      label: 'Classe',
      type: 'select',
      required: true,
      options: classOptions,
      validate: (v) => {
        const klass = classById.get(v)
        const count = data.students.filter((s) => s.classId === v && s.id !== crud.editing?.id).length
        return klass && count >= klass.capacity ? `La classe ${klass.name} est complète (${klass.capacity} places).` : undefined
      },
    },
    { name: 'status', label: 'Statut', type: 'select', required: true, options: [{ value: 'actif', label: 'Actif' }, { value: 'inactif', label: 'Inactif' }, { value: 'suspendu', label: 'Suspendu' }] },
    { name: 'parentName', label: 'Parent / tuteur', required: true },
    { name: 'parentPhone', label: 'Téléphone du parent', type: 'tel', required: true, placeholder: '+225 07 00 00 00 00' },
    { name: 'email', label: 'E-mail', type: 'email', placeholder: 'parent@exemple.com' },
    { name: 'address', label: 'Adresse', placeholder: 'Cocody, Abidjan' },
  ]

  const e = crud.editing
  const initial = {
    firstName: e?.firstName ?? '',
    lastName: e?.lastName ?? '',
    gender: e?.gender ?? '',
    birthDate: e?.birthDate ?? '',
    classId: e?.classId ?? '',
    status: e?.status ?? 'actif',
    parentName: e?.parentName ?? '',
    parentPhone: e?.parentPhone ?? '',
    email: e?.email ?? '',
    address: e?.address ?? '',
  }

  const girls = data.students.filter((s) => s.gender === 'F').length

  return (
    <>
      <PageHeader
        eyebrow="Scolarité"
        title="Élèves"
        description="Gérez les dossiers, les affectations de classe et les contacts des familles."
        actions={
          <>
            <Button
              variant="outline"
              onClick={() => {
                downloadCSV(
                  'eleves.csv',
                  rows.map((s) => ({ Matricule: s.matricule, Nom: s.lastName, Prénom: s.firstName, Sexe: s.gender, Classe: classById.get(s.classId)?.name ?? '', Naissance: s.birthDate, Parent: s.parentName, Téléphone: s.parentPhone, Statut: s.status })),
                )
                toast.success(`${rows.length} élève(s) exporté(s).`)
              }}
            >
              <Download />
              Exporter
            </Button>
            {editable && (
              <Button onClick={crud.openCreate}>
                <Plus />
                Nouvel élève
              </Button>
            )}
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total élèves" value={String(data.students.length)} icon={GraduationCap} />
        <StatCard label="Actifs" value={String(data.students.filter((s) => s.status === 'actif').length)} icon={UserCheck} tone="success" delay={60} />
        <StatCard label="Filles" value={`${((girls / Math.max(1, data.students.length)) * 100).toFixed(0)} %`} icon={Venus} tone="gold" hint={`${girls} élèves`} delay={120} />
        <StatCard label="Suspendus / inactifs" value={String(data.students.filter((s) => s.status !== 'actif').length)} icon={UserX} tone="danger" delay={180} />
      </div>

      <Toolbar search={search} onSearch={setSearch} placeholder="Nom, matricule, parent…">
        <SimpleSelect ariaLabel="Filtrer par classe" value={classFilter} onValueChange={setClassFilter} options={[{ value: 'all', label: 'Toutes les classes' }, ...classOptions]} />
        <SimpleSelect ariaLabel="Filtrer par statut" value={statusFilter} onValueChange={setStatusFilter} options={[{ value: 'all', label: 'Tous les statuts' }, { value: 'actif', label: 'Actif' }, { value: 'inactif', label: 'Inactif' }, { value: 'suspendu', label: 'Suspendu' }]} />
        <SimpleSelect ariaLabel="Filtrer par sexe" value={genderFilter} onValueChange={setGenderFilter} options={[{ value: 'all', label: 'Tous' }, { value: 'F', label: 'Filles' }, { value: 'M', label: 'Garçons' }]} />
      </Toolbar>

      <DataTable rows={rows} columns={columns} getRowId={(s) => s.id} onRowClick={setViewing} />

      <EntityFormDialog
        open={crud.formOpen}
        onOpenChange={crud.setFormOpen}
        title={e ? "Modifier l'élève" : 'Nouvel élève'}
        description={e ? `Matricule ${e.matricule}` : 'Un matricule unique sera généré automatiquement.'}
        fields={fields}
        initial={initial}
        onSubmit={(v) => {
          const payload = { ...v, gender: v.gender as Student['gender'], status: v.status as Student['status'] }
          if (e) {
            db.update('students', e.id, payload)
            toast.success('Fiche élève mise à jour.')
          } else {
            const next = data.students.reduce((max, s) => Math.max(max, Number(s.matricule.split('-').at(-1)) || 0), 0) + 1
            const matricule = `SCL-${data.settings.schoolYear.slice(2, 4)}-${String(next).padStart(4, '0')}`
            const student = db.add('students', { ...payload, matricule, enrolledAt: todayISO() } as Omit<Student, 'id'>)
            db.notify({ type: 'inscription', title: 'Nouvel élève', message: `${student.firstName} ${student.lastName} a été ajouté(e) en ${classById.get(student.classId)?.name}.` })
            toast.success(`${student.firstName} ${student.lastName} a été ajouté(e).`)
          }
        }}
      />

      <ConfirmDialog
        open={Boolean(crud.deleting)}
        onOpenChange={(o) => !o && crud.setDeleting(null)}
        description={`Supprimer définitivement ${crud.deleting?.firstName} ${crud.deleting?.lastName} ainsi que ses notes, présences et paiements ?`}
        onConfirm={() => {
          const id = crud.deleting!.id
          db.remove('students', id)
          db.replaceWhere('grades', (g) => g.studentId === id, [])
          db.replaceWhere('attendance', (a) => a.studentId === id, [])
          db.replaceWhere('payments', (p) => p.studentId === id, [])
          db.replaceWhere('enrollments', (en) => en.studentId === id, [])
          toast.success('Élève supprimé.')
          crud.setDeleting(null)
        }}
      />

      <StudentSheet student={viewing} onOpenChange={(o) => !o && setViewing(null)} />
    </>
  )
}
