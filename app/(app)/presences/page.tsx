'use client'

import { useMemo, useState } from 'react'
import { CalendarCheck, Save, UserCheck, UserX } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/app/page-header'
import { SimpleSelect } from '@/components/app/simple-select'
import { StatCard } from '@/components/app/stat-card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { todayISO } from '@/lib/format'
import { useCanEdit } from '@/hooks/use-permission'
import { db, useCurrentUser, useDB } from '@/lib/store'
import type { Attendance } from '@/lib/types'

const statuses: Attendance['status'][] = ['présent', 'absent', 'retard', 'excusé']

export default function AttendancePage() {
  const data = useDB()!
  const user = useCurrentUser()
  const editable = useCanEdit('presences')
  const teacherClassIds = useMemo(
    () => new Set((data.teachingAssignments ?? []).filter((item) => item.teacherId === user?.teacherId).map((item) => item.classId)),
    [data.teachingAssignments, user?.teacherId],
  )
  const allowedClasses = user?.role === 'enseignant' ? data.classes.filter((klass) => teacherClassIds.has(klass.id)) : data.classes
  const [classId, setClassId] = useState(allowedClasses[0]?.id ?? '')
  const [date, setDate] = useState(todayISO())
  const [drafts, setDrafts] = useState<Record<string, Attendance['status']>>({})
  const klass = allowedClasses.find((item) => item.id === classId) ?? allowedClasses[0]
  const students = data.students.filter((student) => student.classId === klass?.id)
  const attendanceByStudent = new Map(
    data.attendance.filter((item) => item.classId === klass?.id && item.date === date).map((item) => [item.studentId, item]),
  )
  const marked = students.filter((student) => attendanceByStudent.has(student.id))
  const present = students.filter((student) => ['présent', 'retard'].includes(drafts[student.id] ?? attendanceByStudent.get(student.id)?.status ?? '')).length
  const absent = students.filter((student) => (drafts[student.id] ?? attendanceByStudent.get(student.id)?.status) === 'absent').length

  const save = (studentId: string) => {
    if (!klass) return
    const status = drafts[studentId] ?? attendanceByStudent.get(studentId)?.status ?? 'présent'
    const existing = attendanceByStudent.get(studentId)
    if (existing) db.update('attendance', existing.id, { status, date, classId: klass.id })
    else db.add('attendance', { studentId, classId: klass.id, date, status })
    setDrafts((current) => {
      const next = { ...current }
      delete next[studentId]
      return next
    })
    toast.success('Présence enregistrée.')
  }

  return (
    <>
      <PageHeader eyebrow="Scolarité" title="Présences" description="Faites l’appel par classe et par date." />
      {!allowedClasses.length ? (
        <div className="rounded-2xl border bg-card p-8 text-center">
          <h2 className="font-semibold">Aucune classe affectée</h2>
          <p className="mt-2 text-sm text-muted-foreground">Demandez à la direction de vous affecter à une classe.</p>
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard label="Élèves dans la classe" value={String(students.length)} icon={CalendarCheck} />
            <StatCard label="Présents / en retard" value={String(present)} icon={UserCheck} tone="success" delay={60} />
            <StatCard label="Absents" value={String(absent)} icon={UserX} tone="danger" delay={120} />
          </div>
          <div className="grid gap-3 rounded-2xl border bg-card p-4 sm:grid-cols-2">
            <div>
              <label htmlFor="attendance-class" className="mb-1.5 block text-xs font-medium text-muted-foreground">Classe</label>
              <SimpleSelect id="attendance-class" ariaLabel="Classe de l’appel" value={klass?.id ?? ''} onValueChange={(value) => { setClassId(value); setDrafts({}) }} options={allowedClasses.map((item) => ({ value: item.id, label: item.name }))} />
            </div>
            <div>
              <label htmlFor="attendance-date" className="mb-1.5 block text-xs font-medium text-muted-foreground">Date</label>
              <input id="attendance-date" type="date" value={date} onChange={(event) => { setDate(event.target.value); setDrafts({}) }} className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm" />
            </div>
          </div>
          <div className="overflow-hidden rounded-2xl border bg-card">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow className="bg-muted/50"><TableHead>Élève</TableHead><TableHead>Matricule</TableHead><TableHead>Statut</TableHead><TableHead>Enregistré</TableHead><TableHead /></TableRow></TableHeader>
                <TableBody>
                  {students.map((student) => {
                    const record = attendanceByStudent.get(student.id)
                    const status = drafts[student.id] ?? record?.status ?? 'présent'
                    return (
                      <TableRow key={student.id}>
                        <TableCell className="font-medium">{student.firstName} {student.lastName}</TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">{student.matricule}</TableCell>
                        <TableCell><SimpleSelect ariaLabel={`Présence de ${student.firstName} ${student.lastName}`} value={status} onValueChange={(value) => setDrafts((current) => ({ ...current, [student.id]: value as Attendance['status'] }))} options={statuses.map((value) => ({ value, label: value[0].toUpperCase() + value.slice(1) }))} /></TableCell>
                        <TableCell className="text-muted-foreground">{record ? 'Oui' : 'Non'}</TableCell>
                        <TableCell className="text-right">{editable && <Button size="sm" variant="outline" onClick={() => save(student.id)} disabled={Boolean(record && !drafts[student.id])}><Save />Enregistrer</Button>}</TableCell>
                      </TableRow>
                    )
                  })}
                  {!students.length && <TableRow><TableCell colSpan={5} className="py-12 text-center text-muted-foreground">Aucun élève inscrit dans cette classe.</TableCell></TableRow>}
                </TableBody>
              </Table>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">{marked.length} présence(s) déjà enregistrée(s) pour cette date. Une fiche existante est mise à jour, pas dupliquée.</p>
        </>
      )}
    </>
  )
}
