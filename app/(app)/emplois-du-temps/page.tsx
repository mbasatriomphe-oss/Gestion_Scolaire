'use client'

import { useMemo, useState } from 'react'
import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { CalendarDays, Clock3, DoorOpen } from 'lucide-react'
import { PageHeader } from '@/components/app/page-header'
import { SimpleSelect } from '@/components/app/simple-select'
import { StatCard } from '@/components/app/stat-card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useCurrentUser, useDB } from '@/lib/store'

const days = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']

export default function TimetablePage() {
  return <Suspense fallback={<div className="py-16 text-center text-sm text-muted-foreground">Chargement de l’emploi du temps…</div>}><TimetableView /></Suspense>
}

function TimetableView() {
  const data = useDB()!
  const user = useCurrentUser()
  const searchParams = useSearchParams()
  const teacherClassIds = useMemo(
    () => new Set((data.teachingAssignments ?? []).filter((item) => item.teacherId === user?.teacherId).map((item) => item.classId)),
    [data.teachingAssignments, user?.teacherId],
  )
  const allowedClasses = user?.role === 'enseignant' ? data.classes.filter((klass) => teacherClassIds.has(klass.id)) : data.classes
  const [classId, setClassId] = useState(() => {
    const requested = searchParams.get('classe')
    return allowedClasses.some((klass) => klass.id === requested) ? requested! : allowedClasses[0]?.id ?? ''
  })
  const klass = allowedClasses.find((item) => item.id === classId) ?? allowedClasses[0]
  const [day, setDay] = useState('all')
  const courses = new Map(data.courses.map((course) => [course.id, course]))
  const teachers = new Map(data.teachers.map((teacher) => [teacher.id, teacher]))
  const assignments = new Map((data.teachingAssignments ?? []).map((assignment) => [`${assignment.classId}:${assignment.courseId}`, assignment]))
  const rows = data.timetable
    .filter((entry) => entry.classId === klass?.id && (day === 'all' || entry.day === Number(day)))
    .sort((a, b) => a.day - b.day || a.start.localeCompare(b.start))
  const subjectCount = new Set(rows.map((entry) => entry.courseId)).size

  return (
    <>
      <PageHeader eyebrow="Organisation" title="Emplois du temps" description="Consultez les cours, horaires, salles et enseignants par classe." />
      {!allowedClasses.length ? (
        <div className="rounded-2xl border bg-card p-8 text-center">
          <h2 className="font-semibold">Aucune classe affectée</h2>
          <p className="mt-2 text-sm text-muted-foreground">Demandez à la direction de vous affecter à une classe.</p>
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard label="Cours affichés" value={String(rows.length)} icon={CalendarDays} />
            <StatCard label="Matières différentes" value={String(subjectCount)} icon={Clock3} tone="gold" delay={60} />
            <StatCard label="Classe" value={klass?.name ?? '—'} icon={DoorOpen} tone="success" delay={120} />
          </div>
          <div className="grid gap-3 rounded-2xl border bg-card p-4 sm:grid-cols-2">
            <div>
              <label htmlFor="timetable-class" className="mb-1.5 block text-xs font-medium text-muted-foreground">Classe</label>
              <SimpleSelect id="timetable-class" ariaLabel="Classe de l’emploi du temps" value={klass?.id ?? ''} onValueChange={setClassId} options={allowedClasses.map((item) => ({ value: item.id, label: item.name }))} />
            </div>
            <div>
              <label htmlFor="timetable-day" className="mb-1.5 block text-xs font-medium text-muted-foreground">Jour</label>
              <SimpleSelect id="timetable-day" ariaLabel="Filtrer par jour" value={day} onValueChange={setDay} options={[{ value: 'all', label: 'Toute la semaine' }, ...days.map((name, index) => ({ value: String(index), label: name }))]} />
            </div>
          </div>
          <div className="overflow-hidden rounded-2xl border bg-card">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow className="bg-muted/50"><TableHead>Jour</TableHead><TableHead>Horaire</TableHead><TableHead>Cours</TableHead><TableHead>Enseignant</TableHead><TableHead>Salle</TableHead></TableRow></TableHeader>
                <TableBody>
                  {rows.map((entry) => {
                    const course = courses.get(entry.courseId)
                    const assignment = assignments.get(`${entry.classId}:${entry.courseId}`)
                    const teacher = teachers.get(assignment?.teacherId ?? course?.teacherId ?? '')
                    return (
                      <TableRow key={entry.id}>
                        <TableCell className="font-medium">{days[entry.day] ?? '—'}</TableCell>
                        <TableCell className="font-mono text-xs">{entry.start} – {entry.end}</TableCell>
                        <TableCell>{course?.name ?? 'Cours inconnu'}</TableCell>
                        <TableCell className="text-muted-foreground">{teacher ? `${teacher.firstName} ${teacher.lastName}` : 'Non affecté'}</TableCell>
                        <TableCell>{entry.room || assignment?.room || klass?.room || '—'}</TableCell>
                      </TableRow>
                    )
                  })}
                  {!rows.length && <TableRow><TableCell colSpan={5} className="py-12 text-center text-muted-foreground">Aucun cours planifié pour ce filtre.</TableCell></TableRow>}
                </TableBody>
              </Table>
            </div>
          </div>
        </>
      )}
    </>
  )
}
