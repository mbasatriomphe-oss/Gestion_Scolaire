'use client'

import { useMemo, useState } from 'react'
import { ClipboardList, Save } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PageHeader } from '@/components/app/page-header'
import { SimpleSelect } from '@/components/app/simple-select'
import { StatCard } from '@/components/app/stat-card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { PERIOD_LABELS, PERIODS, SEMESTER_LABELS, SEMESTERS, fmtGrade } from '@/lib/academics'
import { todayISO } from '@/lib/format'
import { useCanEdit } from '@/hooks/use-permission'
import { db, useCurrentUser, useDB } from '@/lib/store'
import type { AssessmentPeriod, Grade, Semester } from '@/lib/types'

export default function GradesPage() {
  const data = useDB()!
  const user = useCurrentUser()
  const editable = useCanEdit('notes')
  const assignments = useMemo(
    () =>
      (data.teachingAssignments ?? []).filter(
        (assignment) => user?.role !== 'enseignant' || assignment.teacherId === user.teacherId,
      ),
    [data.teachingAssignments, user],
  )
  const [assignmentId, setAssignmentId] = useState('')
  const [semester, setSemester] = useState<Semester>('S1')
  const [period, setPeriod] = useState<AssessmentPeriod>('P1')
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState<string | null>(null)
  const assignment = assignments.find((item) => item.id === assignmentId) ?? assignments[0]
  const klass = data.classes.find((item) => item.id === assignment?.classId)
  const course = data.courses.find((item) => item.id === assignment?.courseId)
  const students = useMemo(
    () => data.students.filter((student) => student.classId === assignment?.classId).sort((a, b) => a.lastName.localeCompare(b.lastName, 'fr')),
    [data.students, assignment?.classId],
  )
  const gradeByStudent = useMemo(() => {
    const grades = data.grades.filter(
      (grade) =>
        grade.classId === assignment?.classId &&
        grade.courseId === assignment?.courseId &&
        grade.semester === semester &&
        grade.period === period,
    )
    return new Map(grades.map((grade) => [grade.studentId, grade]))
  }, [data.grades, assignment?.classId, assignment?.courseId, semester, period])
  const savedCount = students.filter((student) => gradeByStudent.has(student.id)).length

  const saveGrade = (studentId: string) => {
    if (!assignment) return
    const rawValue = drafts[studentId] ?? gradeByStudent.get(studentId)?.value.toString() ?? ''
    const value = Number(rawValue)
    if (!rawValue.trim() || !Number.isFinite(value) || value < 0 || value > 20) {
      toast.error('La cote doit être comprise entre 0 et 20.')
      return
    }

    setSaving(studentId)
    const existing = gradeByStudent.get(studentId)
    const payload: Omit<Grade, 'id'> = {
      studentId,
      classId: assignment.classId,
      assignmentId: assignment.id,
      courseId: assignment.courseId,
      semester,
      period,
      value,
      maxValue: 20,
      date: todayISO(),
    }
    if (existing) db.update('grades', existing.id, payload)
    else db.add('grades', payload)
    setDrafts((current) => {
      const next = { ...current }
      delete next[studentId]
      return next
    })
    setSaving(null)
    toast.success('Cote enregistrée.')
  }

  return (
    <>
      <PageHeader
        eyebrow="Évaluations"
        title="Saisie des cotes"
        description="Choisissez votre classe, votre salle, le semestre et la période à évaluer."
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Classe" value={klass?.name ?? '—'} icon={ClipboardList} />
        <StatCard label="Cours" value={course?.name ?? '—'} icon={ClipboardList} tone="gold" delay={60} />
        <StatCard label="Cotes saisies" value={`${savedCount} / ${students.length}`} icon={Save} tone="success" delay={120} />
      </div>
      {!assignments.length ? (
        <div className="rounded-2xl border bg-card p-8 text-center">
          <h2 className="font-semibold">Aucune classe ou salle affectée</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {user?.role === 'enseignant'
              ? 'Demandez à la direction de vous affecter un cours, une classe et une salle.'
              : 'Créez d’abord les affectations dans le menu Pédagogie.'}
          </p>
        </div>
      ) : (
        <>
          <section className="grid gap-3 rounded-2xl border bg-card p-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="sm:col-span-2">
              <label htmlFor="assignment" className="mb-1.5 block text-xs font-medium text-muted-foreground">Classe · cours · salle</label>
              <SimpleSelect
                id="assignment"
                ariaLabel="Classe, cours et salle"
                value={assignment?.id ?? ''}
                onValueChange={(value) => { setAssignmentId(value); setDrafts({}) }}
                options={assignments.map((item) => {
                  const assignedClass = data.classes.find((record) => record.id === item.classId)
                  const assignedCourse = data.courses.find((record) => record.id === item.courseId)
                  return { value: item.id, label: `${assignedClass?.name ?? 'Classe'} · ${assignedCourse?.name ?? 'Cours'} · ${item.room}` }
                })}
              />
            </div>
            <div>
              <label htmlFor="semester" className="mb-1.5 block text-xs font-medium text-muted-foreground">Semestre</label>
              <SimpleSelect id="semester" ariaLabel="Semestre" value={semester} onValueChange={(value) => { setSemester(value as Semester); setDrafts({}) }} options={SEMESTERS.map((value) => ({ value, label: SEMESTER_LABELS[value] }))} />
            </div>
            <div>
              <label htmlFor="period" className="mb-1.5 block text-xs font-medium text-muted-foreground">Évaluation</label>
              <SimpleSelect id="period" ariaLabel="Période d’évaluation" value={period} onValueChange={(value) => { setPeriod(value as AssessmentPeriod); setDrafts({}) }} options={PERIODS.map((value) => ({ value, label: PERIOD_LABELS[value] }))} />
            </div>
          </section>
          <div className="rounded-xl border border-gold/30 bg-gold/5 p-4 text-sm">
            Chaque cote est saisie sur 20. La moyenne semestrielle est calculée à partir des deux périodes et de l’examen, à poids égal.
          </div>
          <div className="overflow-hidden rounded-2xl border bg-card">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Élève</TableHead><TableHead>Matricule</TableHead><TableHead>Cote / 20</TableHead><TableHead>Enregistrée</TableHead><TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.map((student) => {
                    const grade = gradeByStudent.get(student.id)
                    const value = drafts[student.id] ?? (grade ? String(grade.value) : '')
                    return (
                      <TableRow key={student.id}>
                        <TableCell className="font-medium">{student.firstName} {student.lastName}</TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">{student.matricule}</TableCell>
                        <TableCell><Input type="number" min="0" max="20" step="0.25" value={value} disabled={!editable} onChange={(event) => setDrafts((current) => ({ ...current, [student.id]: event.target.value }))} aria-label={`Cote de ${student.firstName} ${student.lastName}`} className="h-9 w-28" /></TableCell>
                        <TableCell className="text-muted-foreground">{grade ? fmtGrade(grade.value) : 'À saisir'}</TableCell>
                        <TableCell className="text-right">
                          {editable && <Button size="sm" variant="outline" disabled={saving === student.id || (value === (grade ? String(grade.value) : '') && Boolean(grade))} onClick={() => saveGrade(student.id)}><Save />Enregistrer</Button>}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                  {!students.length && <TableRow><TableCell colSpan={5} className="py-12 text-center text-muted-foreground">Aucun élève inscrit dans cette classe.</TableCell></TableRow>}
                </TableBody>
              </Table>
            </div>
          </div>
        </>
      )}
    </>
  )
}
