'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { CalendarDays, DoorOpen, Pencil, Plus, Trash2, UserRound } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/app/confirm-dialog'
import { EntityFormDialog, type FieldConfig } from '@/components/app/entity-form-dialog'
import { PageHeader } from '@/components/app/page-header'
import { SimpleSelect } from '@/components/app/simple-select'
import { matches, Toolbar } from '@/components/app/toolbar'
import { useCanEdit } from '@/hooks/use-permission'
import { useCrudState } from '@/hooks/use-crud-state'
import { fmtGrade, studentTermAverages } from '@/lib/academics'
import { LEVELS } from '@/lib/seed'
import { db, useDB } from '@/lib/store'
import type { SchoolClass } from '@/lib/types'
import { cn } from '@/lib/utils'

export default function ClassesPage() {
  const data = useDB()!
  const editable = useCanEdit('classes')
  const crud = useCrudState<SchoolClass>()
  const [search, setSearch] = useState('')
  const [level, setLevel] = useState('all')

  const teacherById = useMemo(() => new Map(data.teachers.map((t) => [t.id, t])), [data.teachers])
  const enriched = useMemo(
    () =>
      data.classes.map((c) => {
        const students = data.students.filter((s) => s.classId === c.id)
        const avgs = studentTermAverages(data, c.id, 'T1').map((r) => r.general).filter((v): v is number => v !== null)
        return { klass: c, size: students.length, girls: students.filter((s) => s.gender === 'F').length, avg: avgs.length ? avgs.reduce((a, b) => a + b, 0) / avgs.length : null }
      }),
    [data],
  )
  const rows = enriched.filter(({ klass }) => (level === 'all' || klass.level === level) && matches(search, klass.name, klass.room, klass.level))

  const fields: FieldConfig[] = [
    {
      name: 'name',
      label: 'Nom de la classe',
      required: true,
      placeholder: '6ème A',
      validate: (v) => (data.classes.some((c) => c.name.toLowerCase() === v.toLowerCase() && c.id !== crud.editing?.id) ? 'Une classe porte déjà ce nom.' : undefined),
    },
    { name: 'level', label: 'Niveau', type: 'select', required: true, options: LEVELS.map((l) => ({ value: l, label: l })) },
    { name: 'room', label: 'Salle', required: true, placeholder: 'Salle 101' },
    {
      name: 'capacity',
      label: 'Capacité',
      type: 'number',
      required: true,
      min: 10,
      max: 80,
      validate: (v) => {
        const size = crud.editing ? data.students.filter((s) => s.classId === crud.editing!.id).length : 0
        return Number(v) < size ? `La classe compte déjà ${size} élèves.` : undefined
      },
    },
    { name: 'headTeacherId', label: 'Professeur principal', type: 'select', required: true, full: true, options: data.teachers.map((t) => ({ value: t.id, label: `${t.firstName} ${t.lastName} — ${t.specialty}` })) },
  ]

  const e = crud.editing

  return (
    <>
      <PageHeader
        eyebrow="Organisation"
        title="Classes"
        description="Effectifs, salles, professeurs principaux et niveau de performance."
        actions={
          editable && (
            <Button onClick={crud.openCreate}>
              <Plus />
              Nouvelle classe
            </Button>
          )
        }
      />
      <Toolbar search={search} onSearch={setSearch} placeholder="Classe, salle…">
        <SimpleSelect ariaLabel="Filtrer par niveau" value={level} onValueChange={setLevel} options={[{ value: 'all', label: 'Tous les niveaux' }, ...LEVELS.map((l) => ({ value: l, label: l }))]} />
      </Toolbar>
      {rows.length === 0 && <p className="py-16 text-center text-sm text-muted-foreground">Aucune classe ne correspond à votre recherche.</p>}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {rows.map(({ klass, size, girls, avg }, i) => {
          const fill = Math.min(100, (size / klass.capacity) * 100)
          const head = teacherById.get(klass.headTeacherId)
          return (
            <article
              key={klass.id}
              className="group flex flex-col gap-4 rounded-2xl border bg-card p-5 shadow-sm transition-all duration-300 animate-in fade-in slide-in-from-bottom-3 fill-mode-both hover:-translate-y-0.5 hover:shadow-md"
              style={{ animationDelay: `${i * 40}ms` }}
            >
              <header className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold tracking-wide text-gold uppercase">{klass.level}</p>
                  <h2 className="font-serif text-2xl font-semibold">{klass.name}</h2>
                </div>
                <div className="text-right">
                  <p className="font-mono text-lg font-semibold tabular-nums">{fmtGrade(avg)}</p>
                  <p className="text-[11px] text-muted-foreground">moy. T1</p>
                </div>
              </header>
              <div>
                <div className="mb-1.5 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Effectif</span>
                  <span className="font-medium tabular-nums">
                    {size} / {klass.capacity}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div className={cn('h-full rounded-full transition-all duration-700', fill >= 95 ? 'bg-destructive' : fill >= 80 ? 'bg-gold' : 'bg-primary dark:bg-chart-1')} style={{ width: `${fill}%` }} />
                </div>
                <p className="mt-1.5 text-xs text-muted-foreground">
                  {girls} filles · {size - girls} garçons
                </p>
              </div>
              <dl className="flex flex-col gap-2 text-sm">
                <div className="flex items-center gap-2">
                  <UserRound className="size-4 text-muted-foreground" aria-hidden="true" />
                  <dt className="sr-only">Professeur principal</dt>
                  <dd className="truncate">{head ? `${head.firstName} ${head.lastName}` : 'Non assigné'}</dd>
                </div>
                <div className="flex items-center gap-2">
                  <DoorOpen className="size-4 text-muted-foreground" aria-hidden="true" />
                  <dt className="sr-only">Salle</dt>
                  <dd>{klass.room}</dd>
                </div>
              </dl>
              <footer className="mt-auto flex items-center gap-2 border-t pt-4">
                <Button nativeButton={false} variant="outline" size="sm" className="flex-1" render={<Link href={`/emplois-du-temps?classe=${klass.id}`} />}>
                  <CalendarDays />
                  Emploi du temps
                </Button>
                {editable && (
                  <>
                    <Button variant="ghost" size="icon-sm" onClick={() => crud.openEdit(klass)} aria-label={`Modifier ${klass.name}`}>
                      <Pencil />
                    </Button>
                    <Button variant="ghost" size="icon-sm" className="text-destructive hover:text-destructive" onClick={() => crud.setDeleting(klass)} aria-label={`Supprimer ${klass.name}`}>
                      <Trash2 />
                    </Button>
                  </>
                )}
              </footer>
            </article>
          )
        })}
      </div>
      <EntityFormDialog
        open={crud.formOpen}
        onOpenChange={crud.setFormOpen}
        title={e ? `Modifier ${e.name}` : 'Nouvelle classe'}
        fields={fields}
        initial={{ name: e?.name ?? '', level: e?.level ?? '', room: e?.room ?? '', capacity: e ? String(e.capacity) : '40', headTeacherId: e?.headTeacherId ?? '' }}
        onSubmit={(v) => {
          const payload = { ...v, capacity: Number(v.capacity) }
          if (e) {
            db.update('classes', e.id, payload)
            toast.success('Classe mise à jour.')
          } else {
            db.add('classes', payload as Omit<SchoolClass, 'id'>)
            toast.success(`Classe ${v.name} créée.`)
          }
        }}
      />
      <ConfirmDialog
        open={Boolean(crud.deleting)}
        onOpenChange={(o) => !o && crud.setDeleting(null)}
        description={`Supprimer la classe ${crud.deleting?.name} et son emploi du temps ?`}
        onConfirm={() => {
          const id = crud.deleting!.id
          if (data.students.some((s) => s.classId === id)) {
            toast.error('Impossible : des élèves sont encore affectés à cette classe.')
          } else {
            db.remove('classes', id)
            db.replaceWhere('timetable', (t) => t.classId === id, [])
            toast.success('Classe supprimée.')
          }
          crud.setDeleting(null)
        }}
      />
    </>
  )
}
