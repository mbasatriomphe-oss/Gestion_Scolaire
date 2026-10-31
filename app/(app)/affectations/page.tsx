'use client'

import { useMemo, useState } from 'react'
import { DoorOpen, Plus, School, Trash2, Users } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/app/confirm-dialog'
import { DataTable, type Column } from '@/components/app/data-table'
import { EntityFormDialog, type FieldConfig } from '@/components/app/entity-form-dialog'
import { PageHeader } from '@/components/app/page-header'
import { RowActions } from '@/components/app/row-actions'
import { StatCard } from '@/components/app/stat-card'
import { matches, Toolbar } from '@/components/app/toolbar'
import { useCanEdit } from '@/hooks/use-permission'
import { useCrudState } from '@/hooks/use-crud-state'
import { db, useDB } from '@/lib/store'
import type { TeachingAssignment } from '@/lib/types'

export default function AssignmentsPage() {
  const data = useDB()!
  const editable = useCanEdit('affectations')
  const crud = useCrudState<TeachingAssignment>()
  const [search, setSearch] = useState('')
  const [deleting, setDeleting] = useState<TeachingAssignment | null>(null)
  const assignments = data.teachingAssignments ?? []
  const classes = useMemo(() => new Map(data.classes.map((item) => [item.id, item])), [data.classes])
  const courses = useMemo(() => new Map(data.courses.map((item) => [item.id, item])), [data.courses])
  const teachers = useMemo(() => new Map(data.teachers.map((item) => [item.id, item])), [data.teachers])
  const rows = assignments.filter((item) => {
    const klass = classes.get(item.classId)
    const course = courses.get(item.courseId)
    const teacher = teachers.get(item.teacherId)
    return matches(search, klass?.name, klass?.option, course?.name, teacher?.firstName, teacher?.lastName, item.room)
  })

  const fields: FieldConfig[] = [
    { name: 'classId', label: 'Classe', type: 'select', required: true, options: data.classes.map((item) => ({ value: item.id, label: `${item.name}${item.option ? ` · ${item.option}` : ''}` })) },
    { name: 'courseId', label: 'Cours', type: 'select', required: true, options: data.courses.map((item) => ({ value: item.id, label: item.name })) },
    { name: 'teacherId', label: 'Enseignant responsable', type: 'select', required: true, options: data.teachers.filter((item) => item.status === 'actif').map((item) => ({ value: item.id, label: `${item.firstName} ${item.lastName}` })) },
    { name: 'room', label: 'Salle', required: true, placeholder: 'Salle 101' },
  ]

  const columns: Column<TeachingAssignment>[] = [
    { key: 'class', header: 'Classe / option', sortValue: (item) => classes.get(item.classId)?.name ?? '', cell: (item) => { const klass = classes.get(item.classId); return <span className="font-medium">{klass?.name ?? 'Classe supprimée'}{klass?.option ? ` · ${klass.option}` : ''}</span> } },
    { key: 'course', header: 'Cours', sortValue: (item) => courses.get(item.courseId)?.name ?? '', cell: (item) => courses.get(item.courseId)?.name ?? 'Cours supprimé' },
    { key: 'teacher', header: 'Enseignant', sortValue: (item) => teachers.get(item.teacherId)?.lastName ?? '', cell: (item) => { const teacher = teachers.get(item.teacherId); return teacher ? `${teacher.firstName} ${teacher.lastName}` : 'Non assigné' } },
    { key: 'room', header: 'Salle', sortValue: (item) => item.room, cell: (item) => <span className="inline-flex items-center gap-2"><DoorOpen className="size-4 text-muted-foreground" />{item.room}</span> },
    { key: 'actions', header: '', className: 'w-12', cell: (item) => <RowActions onEdit={editable ? () => crud.openEdit(item) : undefined} onDelete={editable ? () => setDeleting(item) : undefined} /> },
  ]

  const editing = crud.editing
  return (
    <>
      <PageHeader
        eyebrow="Pédagogie"
        title="Affectations"
        description="Associez chaque cours à une classe, un enseignant responsable et une salle."
        actions={editable && <Button onClick={crud.openCreate}><Plus />Nouvelle affectation</Button>}
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Affectations" value={String(assignments.length)} icon={School} />
        <StatCard label="Classes concernées" value={String(new Set(assignments.map((item) => item.classId)).size)} icon={Users} tone="gold" delay={60} />
        <StatCard label="Salles utilisées" value={String(new Set(assignments.map((item) => item.room.trim().toLowerCase())).size)} icon={DoorOpen} tone="success" delay={120} />
      </div>
      <Toolbar search={search} onSearch={setSearch} placeholder="Classe, cours, enseignant, salle…" />
      <DataTable rows={rows} columns={columns} getRowId={(item) => item.id} pageSize={15} />
      {editable && (
        <EntityFormDialog
          open={crud.formOpen}
          onOpenChange={crud.setFormOpen}
          title={editing ? 'Modifier l’affectation' : 'Nouvelle affectation'}
          description="L’enseignant ne pourra saisir les cotes que pour les classes et cours qui lui sont affectés."
          fields={fields}
          initial={{
            classId: editing?.classId ?? '',
            courseId: editing?.courseId ?? '',
            teacherId: editing?.teacherId ?? '',
            room: editing?.room ?? '',
          }}
          onSubmit={(values) => {
            const duplicate = assignments.some(
              (item) => item.id !== editing?.id && item.classId === values.classId && item.courseId === values.courseId,
            )
            if (duplicate) {
              toast.error('Ce cours est déjà affecté à cette classe.')
              return
            }
            const payload = {
              classId: values.classId,
              courseId: values.courseId,
              teacherId: values.teacherId,
              room: values.room,
            }
            if (editing) {
              db.update('teachingAssignments', editing.id, payload)
              toast.success('Affectation mise à jour.')
            } else {
              db.add('teachingAssignments', payload)
              toast.success('Affectation créée.')
            }
          }}
        />
      )}
      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
        description="Supprimer cette affectation ? Les cotes existantes seront conservées dans les archives."
        onConfirm={() => {
          if (deleting) {
            db.remove('teachingAssignments', deleting.id)
            toast.success('Affectation supprimée.')
          }
          setDeleting(null)
        }}
      />
    </>
  )
}
