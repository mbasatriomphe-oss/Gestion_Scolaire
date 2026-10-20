'use client'

import { useMemo, useState } from 'react'
import { BookOpen, Clock, Plus, Scale } from 'lucide-react'
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
import { matches, Toolbar } from '@/components/app/toolbar'
import { useCanEdit } from '@/hooks/use-permission'
import { useCrudState } from '@/hooks/use-crud-state'
import { db, useDB } from '@/lib/store'
import type { Course } from '@/lib/types'

export default function CoursesPage() {
  const data = useDB()!
  const editable = useCanEdit('cours')
  const crud = useCrudState<Course>()
  const [search, setSearch] = useState('')
  const [teacher, setTeacher] = useState('all')

  const teacherById = useMemo(() => new Map(data.teachers.map((t) => [t.id, t])), [data.teachers])
  const slots = useMemo(() => {
    const m = new Map<string, number>()
    for (const t of data.timetable) m.set(t.courseId, (m.get(t.courseId) ?? 0) + 1)
    return m
  }, [data.timetable])

  const rows = data.courses.filter((c) => {
    const t = teacherById.get(c.teacherId)
    return (teacher === 'all' || c.teacherId === teacher) && matches(search, c.name, c.code, t?.firstName, t?.lastName)
  })

  const columns: Column<Course>[] = [
    {
      key: 'name',
      header: 'Matière',
      sortValue: (c) => c.name,
      cell: (c) => (
        <div className="flex items-center gap-3">
          <span className="size-9 shrink-0 rounded-xl" style={{ background: `color-mix(in oklch, ${c.color} 22%, transparent)`, boxShadow: `inset 0 0 0 2px ${c.color}` }} aria-hidden="true" />
          <div className="flex flex-col">
            <span className="font-medium">{c.name}</span>
            <span className="font-mono text-xs text-muted-foreground">{c.code}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'teacher',
      header: 'Enseignant',
      sortValue: (c) => teacherById.get(c.teacherId)?.lastName ?? '',
      cell: (c) => {
        const t = teacherById.get(c.teacherId)
        return t ? <PersonCell name={`${t.firstName} ${t.lastName}`} sub={t.specialty} /> : <span className="text-muted-foreground">Non assigné</span>
      },
    },
    { key: 'coef', header: 'Coef.', sortValue: (c) => c.coefficient, className: 'tabular-nums font-semibold', cell: (c) => c.coefficient },
    { key: 'hours', header: 'Heures / sem.', sortValue: (c) => c.hoursPerWeek, headClassName: 'hidden sm:table-cell', className: 'hidden sm:table-cell tabular-nums', cell: (c) => `${c.hoursPerWeek} h` },
    { key: 'slots', header: 'Créneaux planifiés', headClassName: 'hidden lg:table-cell', className: 'hidden lg:table-cell tabular-nums text-muted-foreground', sortValue: (c) => slots.get(c.id) ?? 0, cell: (c) => slots.get(c.id) ?? 0 },
    { key: 'actions', header: '', className: 'w-12', cell: (c) => <RowActions onEdit={editable ? () => crud.openEdit(c) : undefined} onDelete={editable ? () => crud.setDeleting(c) : undefined} /> },
  ]

  const fields: FieldConfig[] = [
    { name: 'name', label: 'Intitulé', required: true, placeholder: 'Mathématiques' },
    {
      name: 'code',
      label: 'Code',
      required: true,
      placeholder: 'MATH',
      validate: (v) => (!/^[A-Z0-9-]{2,8}$/.test(v.toUpperCase()) ? '2 à 8 caractères alphanumériques.' : data.courses.some((c) => c.code.toUpperCase() === v.toUpperCase() && c.id !== crud.editing?.id) ? 'Code déjà utilisé.' : undefined),
    },
    { name: 'coefficient', label: 'Coefficient', type: 'number', required: true, min: 1, max: 8 },
    { name: 'hoursPerWeek', label: 'Heures par semaine', type: 'number', required: true, min: 1, max: 10 },
    { name: 'teacherId', label: 'Enseignant', type: 'select', required: true, options: data.teachers.map((t) => ({ value: t.id, label: `${t.firstName} ${t.lastName}` })) },
    { name: 'color', label: 'Couleur', type: 'color', required: true },
  ]

  const e = crud.editing
  return (
    <>
      <PageHeader
        eyebrow="Pédagogie"
        title="Cours & matières"
        description="Matières enseignées, coefficients, volumes horaires et responsables."
        actions={
          editable && (
            <Button onClick={crud.openCreate}>
              <Plus />
              Nouvelle matière
            </Button>
          )
        }
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Matières" value={String(data.courses.length)} icon={BookOpen} />
        <StatCard label="Volume horaire hebdo." value={`${data.courses.reduce((a, c) => a + c.hoursPerWeek, 0)} h`} icon={Clock} tone="gold" delay={60} />
        <StatCard label="Total coefficients" value={String(data.courses.reduce((a, c) => a + c.coefficient, 0))} icon={Scale} tone="success" delay={120} />
      </div>
      <Toolbar search={search} onSearch={setSearch} placeholder="Matière, code, enseignant…">
        <SimpleSelect ariaLabel="Filtrer par enseignant" value={teacher} onValueChange={setTeacher} options={[{ value: 'all', label: 'Tous les enseignants' }, ...data.teachers.map((t) => ({ value: t.id, label: `${t.firstName} ${t.lastName}` }))]} />
      </Toolbar>
      <DataTable rows={rows} columns={columns} getRowId={(c) => c.id} />
      <EntityFormDialog
        open={crud.formOpen}
        onOpenChange={crud.setFormOpen}
        title={e ? `Modifier ${e.name}` : 'Nouvelle matière'}
        fields={fields}
        initial={{ name: e?.name ?? '', code: e?.code ?? '', coefficient: e ? String(e.coefficient) : '2', hoursPerWeek: e ? String(e.hoursPerWeek) : '3', teacherId: e?.teacherId ?? '', color: e?.color?.startsWith('#') ? e.color : '#1e3a8a' }}
        onSubmit={(v) => {
          const payload = { ...v, code: v.code.toUpperCase(), coefficient: Number(v.coefficient), hoursPerWeek: Number(v.hoursPerWeek) }
          if (e) {
            db.update('courses', e.id, payload)
            toast.success('Matière mise à jour.')
          } else {
            db.add('courses', payload as Omit<Course, 'id'>)
            toast.success(`Matière ${v.name} ajoutée.`)
          }
        }}
      />
      <ConfirmDialog
        open={Boolean(crud.deleting)}
        onOpenChange={(o) => !o && crud.setDeleting(null)}
        description={`Supprimer ${crud.deleting?.name} ? Les notes et créneaux associés seront également supprimés.`}
        onConfirm={() => {
          const id = crud.deleting!.id
          db.remove('courses', id)
          db.replaceWhere('grades', (g) => g.courseId === id, [])
          db.replaceWhere('timetable', (t) => t.courseId === id, [])
          toast.success('Matière supprimée.')
          crud.setDeleting(null)
        }}
      />
    </>
  )
}
