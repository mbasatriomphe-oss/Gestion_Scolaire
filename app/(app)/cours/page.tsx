'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { BookOpen, Plus, Scale } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/app/confirm-dialog'
import { DataTable, type Column } from '@/components/app/data-table'
import { EntityFormDialog, type FieldConfig } from '@/components/app/entity-form-dialog'
import { PageHeader } from '@/components/app/page-header'
import { RowActions } from '@/components/app/row-actions'
import { SimpleSelect } from '@/components/app/simple-select'
import { StatCard } from '@/components/app/stat-card'
import { matches, Toolbar } from '@/components/app/toolbar'
import { getApiErrorMessage } from '@/lib/api'
import { useCurrentUser } from '@/lib/store'
import {
  createSchoolCourse, deleteSchoolCourse, loadCourses, updateSchoolCourse,
  type SchoolCourse, type SchoolCycle,
} from '@/lib/school-api'

export default function CoursesPage() {
  const admin = useCurrentUser()?.role === 'admin'
  const [courses, setCourses] = useState<SchoolCourse[]>([])
  const [cycles, setCycles] = useState<SchoolCycle[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [cycleFilter, setCycleFilter] = useState('all')
  const [editing, setEditing] = useState<SchoolCourse | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [deleting, setDeleting] = useState<SchoolCourse | null>(null)

  const refresh = useCallback(async () => {
    const next = await loadCourses()
    setCourses(next.courses)
    setCycles(next.cycles)
    setError('')
  }, [])
  useEffect(() => { void refresh().catch((cause: unknown) => setError(getApiErrorMessage(cause))).finally(() => setLoading(false)) }, [refresh])

  const cycleById = useMemo(() => new Map(cycles.map((cycle) => [cycle.id_cycle, cycle])), [cycles])
  const rows = courses.filter((course) => (cycleFilter === 'all' || (course.cycles ?? [{id_cycle: course.id_cycle}]).some(c => String(c.id_cycle) === cycleFilter)) && matches(search, course.intitule, course.code, cycleById.get(course.id_cycle)?.libelle))
  const fields: FieldConfig[] = [
    { name: 'intitule', label: 'Intitulé du cours', required: true, placeholder: 'Mathématiques' },
    { name: 'code', label: 'Code', required: true, placeholder: 'MATH', validate: (value) => /^[A-Za-z0-9-]{2,20}$/.test(value) ? undefined : 'Utilisez 2 à 20 lettres, chiffres ou tirets.' },
    { name: 'cycle_ids', label: 'Cycles', type: 'multiselect', required: true, options: cycles.map((cycle) => ({ value: String(cycle.id_cycle), label: cycle.libelle })) },
    { name: 'coefficient', label: 'Coefficient', type: 'number', min: 1, max: 20, required: true },
    { name: 'domaine_bulletin', label: 'Domaine du bulletin', placeholder: 'DOMAINE DES SCIENCES' },
    { name: 'sous_domaine_bulletin', label: 'Sous-domaine du bulletin', placeholder: 'Sous-domaine des Mathématiques' },
    { name: 'actif', label: 'Statut', type: 'select', required: true, options: [{ value: 'oui', label: 'Actif' }, { value: 'non', label: 'Inactif' }] },
  ]
  const columns: Column<SchoolCourse>[] = [
    { key: 'name', header: 'Cours', sortValue: (course) => course.intitule, cell: (course) => <span className="font-medium">{course.intitule}</span> },
    { key: 'code', header: 'Code', sortValue: (course) => course.code, cell: (course) => <span className="font-mono text-xs">{course.code}</span> },
    { key: 'cycle', header: 'Cycle', sortValue: (course) => cycleById.get(course.id_cycle)?.libelle ?? '', cell: (course) => (course.cycles ?? [cycleById.get(course.id_cycle)]).map(c => c?.libelle).filter(Boolean).join(', ') },
    { key: 'coefficient', header: 'Coefficient', sortValue: (course) => course.coefficient, cell: (course) => course.coefficient },
    { key: 'domaine', header: 'Domaine du bulletin', sortValue: (course) => course.domaine_bulletin ?? '', cell: (course) => course.domaine_bulletin ?? '—' },
    { key: 'status', header: 'Statut', cell: (course) => course.actif ? 'Actif' : 'Inactif' },
    ...(admin ? [{ key: 'actions', header: '', className: 'w-12', cell: (course: SchoolCourse) => <RowActions onEdit={() => { setEditing(course); setFormOpen(true) }} onDelete={() => setDeleting(course)} /> } satisfies Column<SchoolCourse>] : []),
  ]

  return <>
    <PageHeader eyebrow="Pédagogie" title={admin ? 'Cours et matières' : 'Mes cours'} description={admin ? 'Définissez les cours et leur coefficient ; affectez ensuite chaque cours à une classe et à un enseignant.' : 'Consultez uniquement les cours qui vous sont affectés.'} actions={admin && <Button onClick={() => { setEditing(null); setFormOpen(true) }} disabled={loading || Boolean(error)}><Plus />Nouveau cours</Button>} />
    <div className="grid gap-4 sm:grid-cols-2"><StatCard label="Cours" value={String(courses.length)} icon={BookOpen} /><StatCard label="Total des coefficients" value={String(courses.reduce((sum, course) => sum + Number(course.coefficient), 0))} icon={Scale} tone="gold" /></div>
    {loading && <p role="status" className="text-sm text-muted-foreground">Chargement des cours…</p>}
    {error && <div role="alert" className="rounded-xl border border-destructive/40 p-4 text-sm text-destructive">{error} <Button variant="outline" onClick={() => { void refresh().catch((cause: unknown) => setError(getApiErrorMessage(cause))) }}>Réessayer</Button></div>}
    <Toolbar search={search} onSearch={setSearch} placeholder="Cours ou code…"><SimpleSelect ariaLabel="Filtrer par cycle" value={cycleFilter} onValueChange={setCycleFilter} options={[{ value: 'all', label: 'Tous les cycles' }, ...cycles.map((cycle) => ({ value: String(cycle.id_cycle), label: cycle.libelle }))]} /></Toolbar>
    {!loading && !error && <DataTable rows={rows} columns={columns} getRowId={(course) => String(course.id_cours)} />}
    <EntityFormDialog open={formOpen} onOpenChange={setFormOpen} title={editing ? `Modifier ${editing.intitule}` : 'Nouveau cours'} fields={fields} initial={{ intitule: editing?.intitule ?? '', code: editing?.code ?? '', cycle_ids: editing ? (editing.cycles ?? [{id_cycle:editing.id_cycle}]).map(c => c.id_cycle).join(',') : '', coefficient: String(editing?.coefficient ?? 2), domaine_bulletin: editing?.domaine_bulletin ?? '', sous_domaine_bulletin: editing?.sous_domaine_bulletin ?? '', actif: editing?.actif === false ? 'non' : 'oui' }} onSubmit={async (values) => {
      const payload = { intitule: values.intitule, code: values.code.toUpperCase(), id_cycle: Number(values.cycle_ids.split(',')[0]), cycle_ids: values.cycle_ids.split(',').map(Number), coefficient: Number(values.coefficient), domaine_bulletin: values.domaine_bulletin || null, sous_domaine_bulletin: values.sous_domaine_bulletin || null, actif: values.actif === 'oui' }
      if (editing) await updateSchoolCourse(editing.id_cours, payload)
      else await createSchoolCourse(payload)
      await refresh()
      toast.success(editing ? 'Cours mis à jour.' : 'Cours créé.')
    }} />
    <ConfirmDialog open={Boolean(deleting)} onOpenChange={(open) => { if (!open) setDeleting(null) }} description={`Supprimer ${deleting?.intitule ?? ''} ? Un cours affecté à une classe ne peut pas être supprimé.`} onConfirm={() => {
      if (!deleting) return
      const id = deleting.id_cours
      setDeleting(null)
      void deleteSchoolCourse(id).then(refresh).then(() => toast.success('Cours supprimé.')).catch((cause: unknown) => toast.error(getApiErrorMessage(cause)))
    }} />
  </>
}
