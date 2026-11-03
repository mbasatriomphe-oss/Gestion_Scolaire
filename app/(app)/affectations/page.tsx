'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { BookOpen, DoorOpen, Plus, School, Users } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/app/confirm-dialog'
import { DataTable, type Column } from '@/components/app/data-table'
import { EntityFormDialog, type FieldConfig } from '@/components/app/entity-form-dialog'
import { PageHeader } from '@/components/app/page-header'
import { RowActions } from '@/components/app/row-actions'
import { StatCard } from '@/components/app/stat-card'
import { matches, Toolbar } from '@/components/app/toolbar'
import { getApiErrorMessage } from '@/lib/api'
import { useCurrentUser } from '@/lib/store'
import {
  createSchoolAssignment, deleteSchoolAssignment, loadAssignments, updateSchoolAssignment,
  type SchoolAssignment, type SchoolClassRecord, type SchoolCourse,
} from '@/lib/school-api'
import type { Teacher } from '@/lib/types'

interface Directory {
  assignments: SchoolAssignment[]
  classes: SchoolClassRecord[]
  courses: SchoolCourse[]
  teachers: Teacher[]
}

export default function AssignmentsPage() {
  const user = useCurrentUser()
  const admin = user?.role === 'admin'
  const [directory, setDirectory] = useState<Directory | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<SchoolAssignment | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [deleting, setDeleting] = useState<SchoolAssignment | null>(null)

  const refresh = useCallback(async () => {
    const next = await loadAssignments({ includeTeachers: admin })
    setDirectory(next)
    setError('')
  }, [admin])
  useEffect(() => { void refresh().catch((cause: unknown) => setError(getApiErrorMessage(cause))).finally(() => setLoading(false)) }, [refresh])

  const assignments = directory?.assignments ?? []
  const classes = directory?.classes ?? []
  const courses = directory?.courses ?? []
  const teachers = directory?.teachers ?? []
  const classById = useMemo(() => new Map(classes.map((item) => [item.id_classe, item])), [classes])
  const courseById = useMemo(() => new Map(courses.map((item) => [item.id_cours, item])), [courses])
  const teacherById = useMemo(() => new Map(teachers.map((item) => [Number(item.id), item])), [teachers])
  const rows = assignments.filter((item) => {
    const klass = classById.get(item.id_classe)
    const course = courseById.get(item.id_cours)
    const teacher = teacherById.get(item.id_enseignant)
    return matches(search, klass?.libelle, course?.intitule, teacher?.firstName, teacher?.lastName, item.salle)
  })

  const fields: FieldConfig[] = [
    { name: 'id_classe', label: 'Classe', type: 'select', required: true, options: classes.filter((klass) => klass.actif || klass.id_classe === editing?.id_classe).map((klass) => ({ value: String(klass.id_classe), label: `${klass.libelle} · ${klass.annee_scolaire?.libelle ?? ''}` })) },
    { name: 'id_cours', label: 'Cours', type: 'select', required: true, options: courses.filter((course) => course.actif || course.id_cours === editing?.id_cours).map((course) => ({ value: String(course.id_cours), label: `${course.intitule} (${course.code})` })), validate: (value, values) => {
      const klass = classes.find((item) => String(item.id_classe) === values.id_classe)
      const course = courses.find((item) => String(item.id_cours) === value)
      if (klass?.niveau && course && !(course.cycles ?? [{id_cycle:course.id_cycle}]).some(c => c.id_cycle === klass.niveau?.id_cycle)) return 'Ce cours appartient à un autre cycle que la classe.'
      if (assignments.some((item) => item.id_affectation !== editing?.id_affectation && String(item.id_classe) === values.id_classe && String(item.id_cours) === value)) return 'Ce cours est déjà affecté à cette classe.'
      return undefined
    } },
    { name: 'id_enseignant', label: 'Enseignant responsable', type: 'select', required: true, options: teachers.filter((teacher) => teacher.status !== 'inactif' || Number(teacher.id) === editing?.id_enseignant).map((teacher) => ({ value: teacher.id, label: `${teacher.firstName} ${teacher.lastName}` })) },
    { name: 'salle', label: 'Salle où se déroule le cours', required: true, placeholder: 'Salle 101' },
  ]
  const columns: Column<SchoolAssignment>[] = [
    { key: 'class', header: 'Classe', sortValue: (item) => classById.get(item.id_classe)?.libelle ?? '', cell: (item) => <span className="font-medium">{classById.get(item.id_classe)?.libelle ?? item.classe?.libelle ?? 'Classe inconnue'}</span> },
    { key: 'course', header: 'Cours', sortValue: (item) => courseById.get(item.id_cours)?.intitule ?? '', cell: (item) => courseById.get(item.id_cours)?.intitule ?? item.cours?.intitule ?? 'Cours inconnu' },
    { key: 'teacher', header: 'Enseignant', sortValue: (item) => teacherById.get(item.id_enseignant)?.lastName ?? '', cell: (item) => { const teacher = teacherById.get(item.id_enseignant); return teacher ? `${teacher.firstName} ${teacher.lastName}` : item.enseignant ? `${item.enseignant.prenom} ${item.enseignant.nom}` : 'Enseignant inconnu' } },
    { key: 'room', header: 'Salle', sortValue: (item) => item.salle ?? '', cell: (item) => <span className="inline-flex items-center gap-2"><DoorOpen className="size-4 text-muted-foreground" />{item.salle || 'À préciser'}</span> },
    ...(admin ? [{ key: 'actions', header: '', className: 'w-12', cell: (item: SchoolAssignment) => <RowActions onEdit={() => { setEditing(item); setFormOpen(true) }} onDelete={() => setDeleting(item)} /> } satisfies Column<SchoolAssignment>] : []),
  ]

  return <>
    <PageHeader eyebrow="Pédagogie" title={admin ? 'Affectations des cours' : 'Mes affectations'} description={admin ? 'Un cours d’une classe est confié à un enseignant et à une salle.' : 'Vos cours, classes et salles affectés apparaissent ici.'} actions={admin && <Button onClick={() => { setEditing(null); setFormOpen(true) }} disabled={loading || Boolean(error)}><Plus />Nouvelle affectation</Button>} />
    <div className="grid gap-4 sm:grid-cols-3"><StatCard label="Affectations" value={String(assignments.length)} icon={BookOpen} /><StatCard label="Classes" value={String(new Set(assignments.map((item) => item.id_classe)).size)} icon={School} tone="gold" /><StatCard label="Enseignants" value={String(new Set(assignments.map((item) => item.id_enseignant)).size)} icon={Users} tone="success" /></div>
    {loading && <p role="status" className="text-sm text-muted-foreground">Chargement des affectations…</p>}
    {error && <div role="alert" className="rounded-xl border border-destructive/40 p-4 text-sm text-destructive">{error} <Button variant="outline" onClick={() => { void refresh().catch((cause: unknown) => setError(getApiErrorMessage(cause))) }}>Réessayer</Button></div>}
    <Toolbar search={search} onSearch={setSearch} placeholder="Classe, cours, enseignant ou salle…" />
    {!loading && !error && <DataTable rows={rows} columns={columns} getRowId={(item) => String(item.id_affectation)} />}
    <EntityFormDialog open={formOpen} onOpenChange={setFormOpen} title={editing ? 'Modifier l’affectation' : 'Nouvelle affectation'} fields={fields} initial={{ id_classe: String(editing?.id_classe ?? ''), id_cours: String(editing?.id_cours ?? ''), id_enseignant: String(editing?.id_enseignant ?? ''), salle: editing?.salle ?? '' }} onSubmit={async (values) => {
      const payload = { id_classe: Number(values.id_classe), id_cours: Number(values.id_cours), id_enseignant: Number(values.id_enseignant), salle: values.salle }
      if (editing) await updateSchoolAssignment(editing.id_affectation, payload)
      else await createSchoolAssignment(payload)
      await refresh()
      toast.success(editing ? 'Affectation mise à jour.' : 'Affectation créée.')
    }} />
    <ConfirmDialog open={Boolean(deleting)} onOpenChange={(open) => { if (!open) setDeleting(null) }} description="Supprimer cette affectation ? Une affectation avec des cotes enregistrées sera conservée." onConfirm={() => {
      if (!deleting) return
      const id = deleting.id_affectation
      setDeleting(null)
      void deleteSchoolAssignment(id).then(refresh).then(() => toast.success('Affectation supprimée.')).catch((cause: unknown) => toast.error(getApiErrorMessage(cause)))
    }} />
  </>
}
