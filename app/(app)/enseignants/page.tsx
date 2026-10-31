'use client'

import { useEffect, useMemo, useState } from 'react'
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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { matches, Toolbar } from '@/components/app/toolbar'
import { useCanEdit } from '@/hooks/use-permission'
import { useCrudState } from '@/hooks/use-crud-state'
import { downloadCSV, formatCompactMoney, formatDate, formatMoney } from '@/lib/format'
import { db, useCurrentUser, useDB } from '@/lib/store'
import { getApiErrorMessage } from '@/lib/api'
import { createTeacher, deleteTeacher, listTeachers, updateTeacher, type TeacherCredentials, type TeacherFormValues } from '@/lib/teachers-api'
import type { Teacher } from '@/lib/types'

export default function TeachersPage() {
  const q = useSearchParams().get('q') ?? ''
  return <TeachersView key={q} initialQuery={q} />
}

function TeachersView({ initialQuery }: { initialQuery: string }) {
  const data = useDB()!
  const user = useCurrentUser()
  const editable = useCanEdit('enseignants') && user?.role === 'admin'
  const crud = useCrudState<Teacher>()
  const [search, setSearch] = useState(initialQuery)
  const [status, setStatus] = useState('all')
  const [specialty, setSpecialty] = useState('all')
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [reload, setReload] = useState(0)
  const [credentials, setCredentials] = useState<TeacherCredentials | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setLoadError('')
    listTeachers(controller.signal)
      .then((records) => {
        setTeachers(records)
        db.replaceWhere('teachers', (teacher) => /^\d+$/.test(teacher.id), records)
      })
      .catch((error) => {
        if (!controller.signal.aborted) setLoadError(getApiErrorMessage(error))
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [reload])

  const syncLocalTeacher = (teacher: Teacher) => {
    if (db.get().teachers.some((item) => item.id === teacher.id)) db.update('teachers', teacher.id, teacher)
    else db.add('teachers', teacher)
  }

  const specialties = useMemo(() => [...new Set(teachers.map((t) => t.specialty).filter(Boolean))].sort(), [teachers])
  const rows = teachers.filter((t) => (status === 'all' || t.status === status) && (specialty === 'all' || t.specialty === specialty) && matches(search, t.firstName, t.lastName, t.postName, t.email, t.specialty, t.phone))

  const columns: Column<Teacher>[] = [
    { key: 'name', header: 'Enseignant', sortValue: (t) => `${t.lastName} ${t.firstName}`, cell: (t) => <PersonCell name={`${t.firstName} ${t.lastName} ${t.postName ?? ''}`.trim()} sub={[t.matricule, t.specialty].filter(Boolean).join(' · ')} /> },
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
    { key: 'hired', header: 'Embauche', headClassName: 'hidden lg:table-cell', className: 'hidden lg:table-cell text-muted-foreground', sortValue: (t) => t.hiredAt, cell: (t) => t.hiredAt ? formatDate(t.hiredAt) : '—' },
    { key: 'salary', header: 'Salaire', headClassName: 'hidden xl:table-cell', className: 'hidden xl:table-cell tabular-nums', sortValue: (t) => t.salary, cell: (t) => formatMoney(t.salary, data.settings.currency) },
    { key: 'status', header: 'Statut', sortValue: (t) => t.status, cell: (t) => <StatusBadge status={t.status} /> },
    { key: 'actions', header: '', className: 'w-12', cell: (t) => <RowActions onEdit={editable ? () => crud.openEdit(t) : undefined} onDelete={editable ? () => crud.setDeleting(t) : undefined} /> },
  ]

  const fields: FieldConfig[] = [
    { name: 'firstName', label: 'Prénom', required: true },
    { name: 'lastName', label: 'Nom', required: true },
    { name: 'postName', label: 'Postnom', required: true },
    { name: 'gender', label: 'Sexe', type: 'select', required: true, options: [{ value: 'F', label: 'Femme' }, { value: 'M', label: 'Homme' }] },
    { name: 'specialty', label: 'Spécialité', required: true, placeholder: 'Mathématiques' },
    {
      name: 'email',
      label: 'E-mail',
      type: 'email',
      required: true,
      validate: (v) => (teachers.some((t) => t.email.toLowerCase() === v.toLowerCase() && t.id !== crud.editing?.id) ? 'Cet e-mail est déjà utilisé.' : undefined),
    },
    { name: 'phone', label: 'Téléphone', type: 'tel', required: true },
    { name: 'hiredAt', label: "Date d'embauche", type: 'date', required: true },
    { name: 'salary', label: `Salaire mensuel (${data.settings.currency})`, type: 'number', required: true, min: 0, step: 1, validate: (value) => Number.isFinite(Number(value)) ? undefined : 'Salaire invalide.' },
    { name: 'status', label: 'Statut', type: 'select', required: true, options: [{ value: 'actif', label: 'Actif' }, { value: 'congé', label: 'En congé' }, { value: 'inactif', label: 'Inactif' }] },
  ]

  const e = crud.editing
  const payroll = teachers.filter((t) => t.status !== 'inactif').reduce((a, t) => a + t.salary, 0)

  return (
    <>
      <PageHeader
        eyebrow="Ressources humaines"
        title="Enseignants"
        description="Fiches, spécialités et coordonnées du corps enseignant."
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
        <StatCard label="Enseignants" value={String(teachers.length)} icon={Users} hint={`${teachers.filter((t) => t.status === 'actif').length} en activité`} />
        <StatCard label="Spécialités" value={String(specialties.length)} icon={Briefcase} tone="gold" delay={60} />
        <StatCard label="Masse salariale / mois" value={formatCompactMoney(payroll, data.settings.currency)} icon={Briefcase} tone="success" delay={120} />
      </div>
      <Toolbar search={search} onSearch={setSearch} placeholder="Nom, e-mail, spécialité…">
        <SimpleSelect ariaLabel="Filtrer par spécialité" value={specialty} onValueChange={setSpecialty} options={[{ value: 'all', label: 'Toutes spécialités' }, ...specialties.map((s) => ({ value: s, label: s }))]} />
        <SimpleSelect ariaLabel="Filtrer par statut" value={status} onValueChange={setStatus} options={[{ value: 'all', label: 'Tous les statuts' }, { value: 'actif', label: 'Actif' }, { value: 'congé', label: 'En congé' }, { value: 'inactif', label: 'Inactif' }]} />
      </Toolbar>
      {loadError && (
        <div role="alert" className="flex items-center gap-3 rounded-lg border border-destructive/30 p-4 text-sm text-destructive">
          <span>{loadError}</span>
          <Button variant="outline" onClick={() => setReload((value) => value + 1)}>Réessayer</Button>
        </div>
      )}
      {loading ? <p className="text-sm text-muted-foreground">Chargement des enseignants…</p> : !loadError && <DataTable rows={rows} columns={columns} getRowId={(t) => t.id} />}
      <EntityFormDialog
        open={crud.formOpen}
        onOpenChange={crud.setFormOpen}
        title={e ? "Modifier l'enseignant" : 'Nouvel enseignant'}
        fields={fields}
        initial={{
          firstName: e?.firstName ?? '',
          lastName: e?.lastName ?? '',
          postName: e?.postName ?? '',
          gender: e?.gender ?? '',
          specialty: e?.specialty ?? '',
          email: e?.email ?? '',
          phone: e?.phone ?? '',
          hiredAt: e?.hiredAt ?? '',
          salary: e ? String(e.salary) : '',
          status: e?.status ?? 'actif',
        }}
        onSubmit={async (v) => {
          const values: TeacherFormValues = {
            firstName: v.firstName,
            lastName: v.lastName,
            postName: v.postName,
            gender: v.gender,
            email: v.email,
            phone: v.phone,
            specialty: v.specialty,
            hiredAt: v.hiredAt,
            salary: v.salary,
            status: v.status,
          }
          try {
            if (e) {
              const updated = await updateTeacher(e.id, values)
              setTeachers((items) => items.map((item) => item.id === e.id ? updated : item))
              syncLocalTeacher(updated)
              toast.success('Enseignant mis à jour.')
            } else {
              const result = await createTeacher(values)
              setTeachers((items) => [result.teacher, ...items])
              syncLocalTeacher(result.teacher)
              setCredentials(result.credentials)
              toast.success(`${v.firstName} ${v.lastName} a été enregistré.`)
            }
          } catch (error) {
            return getApiErrorMessage(error)
          }
        }}
      />
      <ConfirmDialog
        open={Boolean(crud.deleting)}
        onOpenChange={(o) => !o && crud.setDeleting(null)}
        description={`Supprimer ${crud.deleting?.firstName} ${crud.deleting?.lastName} ? Les enseignants ayant des cours affectés ne peuvent pas être supprimés.`}
        onConfirm={() => {
          const id = crud.deleting!.id
          void deleteTeacher(id).then(() => {
            setTeachers((items) => items.filter((item) => item.id !== id))
            db.remove('teachers', id)
            toast.success('Enseignant supprimé.')
          }).catch((error) => toast.error(getApiErrorMessage(error)))
          crud.setDeleting(null)
        }}
      />
      <Dialog open={Boolean(credentials) && !crud.formOpen} onOpenChange={(open) => { if (!open) setCredentials(null) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Identifiants de l’enseignant</DialogTitle>
            <DialogDescription>Copiez ces identifiants maintenant. Le mot de passe ne sera plus affiché après la fermeture de cette fenêtre.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <Label htmlFor="teacher-login">Identifiant</Label>
            <Input id="teacher-login" readOnly value={credentials?.login ?? ''} onFocus={(event) => event.currentTarget.select()} />
            <Label htmlFor="teacher-password">Mot de passe initial</Label>
            <Input id="teacher-password" readOnly value={credentials?.mot_de_passe ?? ''} onFocus={(event) => event.currentTarget.select()} />
          </div>
          <DialogFooter><Button onClick={() => setCredentials(null)}>J’ai noté les identifiants</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
