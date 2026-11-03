'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Download, Eye, GraduationCap, Plus, UserCheck, UserX, Venus } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { getApiErrorMessage } from '@/lib/api'
import { useCanEdit } from '@/hooks/use-permission'
import { useCrudState } from '@/hooks/use-crud-state'
import { downloadCSV, formatDate, todayISO } from '@/lib/format'
import { db, useCurrentUser } from '@/lib/store'
import { createStudent, latestEnrollment, loadStudentDirectory, toLocalClass, toLocalStudent, updateStudent, type StudentDirectory, type StudentPayload, type StudentProfilePayload } from '@/lib/students-api'
import type { Student } from '@/lib/types'

export default function StudentsPage() {
  const q = useSearchParams().get('q') ?? ''
  return <StudentsView key={q} initialQuery={q} />
}

function StudentsView({ initialQuery }: { initialQuery: string }) {
  const user = useCurrentUser()
  const editable = useCanEdit('eleves')
  const crud = useCrudState<Student>()
  const [search, setSearch] = useState(initialQuery)
  const [classFilter, setClassFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [genderFilter, setGenderFilter] = useState('all')
  const [viewing, setViewing] = useState<Student | null>(null)
  const [directory, setDirectory] = useState<StudentDirectory | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [credentials, setCredentials] = useState<{ login: string; mot_de_passe: string } | null>(null)

  const refresh = useCallback(async () => {
    const loaded = await loadStudentDirectory()
    setDirectory(loaded)
    setLoadError('')
    return loaded
  }, [])

  useEffect(() => {
    let active = true
    loadStudentDirectory()
      .then((loaded) => {
        if (active) {
          setDirectory(loaded)
          setLoadError('')
        }
      })
      .catch((error: unknown) => {
        if (active) setLoadError(getApiErrorMessage(error))
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [])

  const students = useMemo(
    () => directory?.students.map((student) => toLocalStudent(student, latestEnrollment(directory, student.id_eleve))) ?? [],
    [directory],
  )
  const realClasses = useMemo(() => directory?.classes.map(toLocalClass) ?? [], [directory])

  useEffect(() => {
    if (!directory) return
    const studentIds = new Set(students.map((student) => student.id))
    const classIds = new Set(realClasses.map((klass) => klass.id))
    db.replaceWhere('students', (student) => studentIds.has(student.id), students)
    db.replaceWhere('classes', (klass) => classIds.has(klass.id), realClasses)
  }, [directory, students, realClasses])

  const classById = useMemo(() => new Map(realClasses.map((klass) => [klass.id, klass])), [realClasses])
  const yearById = useMemo(() => new Map(directory?.years.map((year) => [year.id_annee, year]) ?? []), [directory])
  const classOptions = directory?.classes.map((klass) => ({ value: String(klass.id_classe), label: `${klass.libelle} · ${yearById.get(klass.id_annee)?.libelle ?? 'Année inconnue'}` })) ?? []
  const activeClasses = directory?.classes.filter((klass) => klass.actif && yearById.get(klass.id_annee)?.etat === 'ouverte') ?? []

  const rows = useMemo(
    () =>
      students.filter(
        (s) =>
          (classFilter === 'all' || s.classId === classFilter) &&
          (statusFilter === 'all' || s.status === statusFilter) &&
          (genderFilter === 'all' || s.gender === genderFilter) &&
          matches(search, s.firstName, s.lastName, s.middleName, s.matricule, s.parentName, s.parentPhone, classById.get(s.classId)?.name),
      ),
    [students, classFilter, statusFilter, genderFilter, search, classById],
  )

  const columns: Column<Student>[] = [
    { key: 'name', header: 'Élève', sortValue: (s) => `${s.lastName} ${s.middleName ?? ''} ${s.firstName}`, cell: (s) => <PersonCell name={`${s.firstName} ${s.lastName} ${s.middleName ?? ''}`} sub={s.matricule} /> },
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
          onEdit={user?.role === 'admin' ? () => crud.openEdit(s) : undefined}
        />
      ),
    },
  ]

  const e = crud.editing
  const fields: FieldConfig[] = [
    { name: 'firstName', label: 'Prénom', required: true, placeholder: 'Aminata' },
    { name: 'lastName', label: 'Nom', required: true, placeholder: 'Diallo' },
    { name: 'middleName', label: 'Post-nom', required: true },
    { name: 'gender', label: 'Sexe', type: 'select', required: true, options: [{ value: 'F', label: 'Fille' }, { value: 'M', label: 'Garçon' }] },
    {
      name: 'birthDate',
      label: 'Date de naissance',
      type: 'date',
      required: true,
      validate: (v) => v >= todayISO() ? 'La date doit être antérieure à aujourd’hui.' : undefined,
    },
    { name: 'birthPlace', label: 'Lieu de naissance' },
    {
      name: 'classId',
      visible: () => !crud.editing,
      label: 'Classe',
      type: 'select',
      required: false,
      options: activeClasses.map((klass) => ({ value: String(klass.id_classe), label: classOptions.find((option) => option.value === String(klass.id_classe))?.label ?? klass.libelle })),
      validate: (v) => {
        if (!v) return undefined
        const klass = activeClasses.find((item) => String(item.id_classe) === v)
        if (!klass) return 'Choisissez une classe de l’année scolaire ouverte.'
        const count = directory?.enrollments.filter((enrollment) => enrollment.id_classe === klass.id_classe && enrollment.statut === 'actif' && String(enrollment.id_eleve) !== crud.editing?.id).length ?? 0
        return klass.capacite && count >= klass.capacite ? `La classe ${klass.libelle} est complète (${klass.capacite} places).` : undefined
      },
    },
    { name: 'status', label: 'Statut', type: 'select', required: true, options: [{ value: 'actif', label: 'Actif' }, { value: 'inactif', label: 'Inactif' }] },
    { name: 'parentName', label: 'Parent / tuteur' },
    { name: 'parentPhone', label: 'Téléphone du parent', type: 'tel', placeholder: '+243 97 00 00 000' },
    { name: 'email', label: 'E-mail de l’élève', type: 'email', placeholder: 'eleve@exemple.com' },
    { name: 'address', label: 'Adresse', placeholder: 'Cocody, Abidjan' },
  ]

  const initial = {
    firstName: e?.firstName ?? '',
    lastName: e?.lastName ?? '',
    middleName: e?.middleName ?? '',
    gender: e?.gender ?? '',
    birthDate: e?.birthDate ?? '',
    birthPlace: e?.birthPlace ?? '',
    classId: e && activeClasses.some((klass) => String(klass.id_classe) === e.classId) ? e.classId : '',
    status: e?.status ?? 'actif',
    parentName: e?.parentName ?? '',
    parentPhone: e?.parentPhone ?? '',
    email: e?.email ?? '',
    address: e?.address ?? '',
  }

  const girls = students.filter((s) => s.gender === 'F').length

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
              <Button onClick={crud.openCreate} disabled={loading || Boolean(loadError)}>
                <Plus />
                Nouvel élève
              </Button>
            )}
          </>
        }
      />

      {loading && <p role="status" className="text-sm text-muted-foreground">Chargement des élèves enregistrés…</p>}
      {loadError && (
        <div role="alert" className="flex items-center justify-between gap-3 rounded-lg border border-destructive/40 p-3 text-sm text-destructive">
          <span>{loadError}</span>
          <Button variant="outline" onClick={() => { void refresh().catch((error: unknown) => setLoadError(getApiErrorMessage(error))) }}>Réessayer</Button>
        </div>
      )}
      {!loading && !loadError && activeClasses.length === 0 && editable && (
        <p role="status" className="rounded-lg border border-amber-500/40 p-3 text-sm">
          Aucune classe active n’est disponible pour l’année ouverte. Vous pouvez enregistrer un élève sans classe et l’affecter plus tard.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total élèves" value={String(students.length)} icon={GraduationCap} />
        <StatCard label="Actifs" value={String(students.filter((s) => s.status === 'actif').length)} icon={UserCheck} tone="success" delay={60} />
        <StatCard label="Filles" value={`${((girls / Math.max(1, students.length)) * 100).toFixed(0)} %`} icon={Venus} tone="gold" hint={`${girls} élèves`} delay={120} />
        <StatCard label="Inactifs" value={String(students.filter((s) => s.status !== 'actif').length)} icon={UserX} tone="danger" delay={180} />
      </div>

      <Toolbar search={search} onSearch={setSearch} placeholder="Nom, matricule, parent…">
        <SimpleSelect ariaLabel="Filtrer par classe" value={classFilter} onValueChange={setClassFilter} options={[{ value: 'all', label: 'Toutes les classes' }, ...classOptions]} />
        <SimpleSelect ariaLabel="Filtrer par statut" value={statusFilter} onValueChange={setStatusFilter} options={[{ value: 'all', label: 'Tous les statuts' }, { value: 'actif', label: 'Actif' }, { value: 'inactif', label: 'Inactif' }]} />
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
        onSubmit={async (v) => {
          const klass = activeClasses.find((item) => String(item.id_classe) === v.classId)
          const profile: StudentProfilePayload = {
            nom: v.lastName,
            postnom: v.middleName,
            prenom: v.firstName,
            sexe: v.gender as Student['gender'],
            date_naissance: v.birthDate,
            lieu_naissance: v.birthPlace || null,
            adresse: v.address || null,
            telephone: v.parentPhone || null,
            nom_tuteur: v.parentName || null,
            email: v.email || null,
            actif: v.status === 'actif',
          }
          if (e) {
            const enrollment = klass ? {
              id_classe: klass.id_classe,
              id_annee: klass.id_annee,
              date_inscription: todayISO(),
            } : {}
            const saved = await updateStudent(e.id, { ...profile, ...enrollment })
            setDirectory((current) => {
              if (!current) return current
              const previous = klass ? current.enrollments.find((item) => item.id_eleve === Number(e.id) && item.id_annee === klass.id_annee) : undefined
              const updatedEnrollment = klass ? {
                id_inscription: previous?.id_inscription ?? -Number(e.id),
                id_eleve: Number(e.id),
                id_classe: klass.id_classe,
                id_annee: klass.id_annee,
                date_inscription: previous?.date_inscription ?? todayISO(),
                statut: previous?.statut ?? 'actif' as const,
              } : undefined
              return {
                ...current,
                students: current.students.map((item) => item.id_eleve === saved.id_eleve ? saved : item),
                enrollments: updatedEnrollment
                  ? [updatedEnrollment, ...current.enrollments.filter((item) => item.id_inscription !== updatedEnrollment.id_inscription)]
                  : current.enrollments,
              }
            })
            toast.success('Fiche élève mise à jour.')
          } else {
            if (v.classId && !klass) throw new Error('Choisissez une classe de l’année scolaire ouverte.')
            const payload: StudentPayload = {
              ...profile,
              ...(klass ? {
                id_classe: klass.id_classe,
                id_annee: klass.id_annee,
                date_inscription: todayISO(),
              } : {}),
            }
            const created = await createStudent(payload)
            setDirectory((current) => current ? {
              ...current,
              students: [created.eleve, ...current.students],
              enrollments: created.inscription ? [created.inscription, ...current.enrollments] : current.enrollments,
            } : current)
            setCredentials(created.identifiants_initiaux)
            db.notify({ type: 'inscription', title: 'Nouvel élève', message: `${created.eleve.prenom} ${created.eleve.nom} a été enregistré(e)${klass ? ` en ${klass.libelle}` : ' sans classe'}.` })
            toast.success(`${created.eleve.prenom} ${created.eleve.nom} a été enregistré(e).`)
          }
          void refresh().catch((error: unknown) => setLoadError(getApiErrorMessage(error)))
        }}
      />

      <Dialog open={Boolean(credentials) && !crud.formOpen} onOpenChange={(open) => { if (!open) setCredentials(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Compte de l’élève créé</DialogTitle>
            <DialogDescription>Conservez ces identifiants maintenant. Le mot de passe initial ne sera plus affiché après fermeture.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 rounded-lg border p-4 text-sm">
            <p>Identifiant : <code className="select-all font-semibold">{credentials?.login}</code></p>
            <p>Mot de passe initial : <code className="select-all font-semibold">{credentials?.mot_de_passe}</code></p>
          </div>
          <Button onClick={() => setCredentials(null)}>J’ai conservé ces identifiants</Button>
        </DialogContent>
      </Dialog>

      <StudentSheet student={viewing} onOpenChange={(o) => !o && setViewing(null)} />
    </>
  )
}
