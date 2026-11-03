'use client'

import { StudentGrades } from '@/components/students/student-grades'

import { useEffect, useMemo, useState } from 'react'
import { ClipboardList, Save } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PageHeader } from '@/components/app/page-header'
import { SimpleSelect } from '@/components/app/simple-select'
import { StatCard } from '@/components/app/stat-card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { getApiErrorMessage } from '@/lib/api'
import { createGrade, listGradeAssignments, loadGradeSheet, updateGrade, type GradeAssignment, type GradeSheet } from '@/lib/grading-api'
import { useCurrentUser } from '@/lib/store'

export default function GradesPage() {
  const user = useCurrentUser()
  const editable = user?.role === 'enseignant'
  const [assignments, setAssignments] = useState<GradeAssignment[]>([])
  const [assignmentId, setAssignmentId] = useState('')
  const [sheet, setSheet] = useState<GradeSheet | null>(null)
  const [loading, setLoading] = useState(true)
  const [sheetLoading, setSheetLoading] = useState(false)
  const [error, setError] = useState('')
  const [sheetError, setSheetError] = useState('')
  const [retry, setRetry] = useState(0)
  const [semesterId, setSemesterId] = useState('')
  const [periodId, setPeriodId] = useState('')
  const [drafts, setDrafts] = useState<Record<number, string>>({})
  const [saving, setSaving] = useState<number | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError('')
    listGradeAssignments(controller.signal)
      .then(setAssignments)
      .catch((cause: unknown) => { if (!controller.signal.aborted) setError(getApiErrorMessage(cause)) })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [retry])

  const available = useMemo(() => assignments.filter((item) =>
    user?.role !== 'enseignant' || String(item.id_enseignant) === user.teacherId,
  ), [assignments, user])
  const assignment = available.find((item) => String(item.id_affectation) === assignmentId)

  useEffect(() => {
    if (!assignment) {
      setSheet(null)
      return
    }
    const controller = new AbortController()
    setSheet(null)
    setSheetLoading(true)
    setSheetError('')
    loadGradeSheet(assignment.id_affectation, controller.signal)
      .then(setSheet)
      .catch((cause: unknown) => { if (!controller.signal.aborted) setSheetError(getApiErrorMessage(cause)) })
      .finally(() => { if (!controller.signal.aborted) setSheetLoading(false) })
    return () => controller.abort()
  }, [assignment?.id_affectation, retry])

  const semester = sheet?.semestres.find((item) => String(item.id_semestre) === semesterId) ?? sheet?.semestres[0]
  const period = semester?.periodes.find((item) => String(item.id_periode) === periodId) ?? semester?.periodes[0]
  const students = useMemo(() => [...(sheet?.eleves ?? [])].sort((a, b) =>
    `${a.nom} ${a.postnom} ${a.prenom}`.localeCompare(`${b.nom} ${b.postnom} ${b.prenom}`, 'fr'),
  ), [sheet?.eleves])
  const gradeByStudent = useMemo(() => new Map((sheet?.cotes ?? [])
    .filter((grade) => grade.id_periode === period?.id_periode)
    .map((grade) => [grade.id_eleve, grade])), [sheet?.cotes, period?.id_periode])
  const maximum = Number(sheet?.baremes.find((item) => item.id_periode === period?.id_periode)?.bareme_max ?? 20)
  const savedCount = students.filter((student) => gradeByStudent.has(student.id_eleve)).length

  const saveGrade = async (studentId: number) => {
    if (!assignment || !period) return
    const existing = gradeByStudent.get(studentId)
    const raw = drafts[studentId] ?? (existing ? String(Number(existing.valeur)) : '')
    const value = Number(raw)
    if (!raw.trim() || !Number.isFinite(value) || value < 0 || value > Math.min(20, maximum)) {
      toast.error(`La cote doit être comprise entre 0 et ${Math.min(20, maximum)}.`)
      return
    }
    setSaving(studentId)
    try {
      const saved = existing
        ? await updateGrade(existing.id_cote, value)
        : await createGrade({ id_affectation: assignment.id_affectation, id_periode: period.id_periode, id_eleve: studentId, valeur: value })
      setSheet((current) => current ? {
        ...current,
        cotes: [...current.cotes.filter((item) => item.id_cote !== saved.id_cote), saved],
      } : current)
      setDrafts((current) => {
        const next = { ...current }
        delete next[studentId]
        return next
      })
      toast.success('Cote enregistrée dans la base.')
    } catch (cause) {
      toast.error(getApiErrorMessage(cause))
    } finally {
      setSaving(null)
    }
  }

  if (user?.role === 'admin' || user?.role === 'secretaire') return <StudentGrades />

  return (
    <>
      <PageHeader eyebrow="Évaluations" title="Saisie des cotes" description="Choisissez une classe, son cours et sa salle, puis le semestre et la période à évaluer. L’examen compte double dans la moyenne semestrielle." />
      {error && <p role="alert" className="rounded-lg border border-destructive/40 p-3 text-sm text-destructive">{error} <Button variant="outline" onClick={() => setRetry((value) => value + 1)}>Réessayer</Button></p>}
      {loading && <p role="status" className="text-sm text-muted-foreground">Chargement des affectations…</p>}
      {!loading && !error && available.length === 0 && (
        <div className="rounded-2xl border bg-card p-8 text-center">
          <h2 className="font-semibold">Aucun cours affecté</h2>
          <p className="mt-2 text-sm text-muted-foreground">{user?.role === 'enseignant' ? 'Un administrateur doit affecter un cours, une classe et une salle à votre compte enseignant.' : 'Créez d’abord une affectation de cours à une classe et une salle.'}</p>
        </div>
      )}
      {!loading && !error && available.length > 0 && (
        <section className="rounded-2xl border bg-card p-4">
          <label htmlFor="assignment" className="mb-1.5 block text-sm font-medium">Choisissez la classe, le cours et la salle</label>
          <SimpleSelect id="assignment" ariaLabel="Classe, cours et salle" value={assignmentId}
            onValueChange={(value) => { setAssignmentId(value); setSemesterId(''); setPeriodId(''); setDrafts({}) }}
            options={available.map((item) => ({
              value: String(item.id_affectation),
              label: `${item.classe?.libelle ?? 'Classe'} · ${item.cours?.intitule ?? 'Cours'} · ${item.salle || 'Salle non précisée'}`,
            }))} />
        </section>
      )}
      {assignment && (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard label="Classe et salle" value={`${assignment.classe?.libelle ?? 'Classe'} · ${assignment.salle || 'Salle non précisée'}`} icon={ClipboardList} />
            <StatCard label="Cours" value={assignment.cours?.intitule ?? 'Cours'} icon={ClipboardList} tone="gold" delay={60} />
            <StatCard label="Cotes saisies" value={`${savedCount} / ${students.length}`} icon={Save} tone="success" delay={120} />
          </div>
          <section className="grid gap-3 rounded-2xl border bg-card p-4 sm:grid-cols-2">
            <div>
              <label htmlFor="semester" className="mb-1.5 block text-xs font-medium text-muted-foreground">Semestre</label>
              <SimpleSelect id="semester" ariaLabel="Semestre" value={String(semester?.id_semestre ?? '')}
                onValueChange={(value) => { setSemesterId(value); setPeriodId(''); setDrafts({}) }}
                options={(sheet?.semestres ?? []).map((item) => ({ value: String(item.id_semestre), label: item.libelle }))} />
            </div>
            <div>
              <label htmlFor="period" className="mb-1.5 block text-xs font-medium text-muted-foreground">Évaluation</label>
              <SimpleSelect id="period" ariaLabel="Période d’évaluation" value={String(period?.id_periode ?? '')}
                onValueChange={(value) => { setPeriodId(value); setDrafts({}) }}
                options={(semester?.periodes ?? []).map((item) => ({ value: String(item.id_periode), label: item.libelle }))} />
            </div>
          </section>
          {sheetError && <p role="alert" className="rounded-lg border border-destructive/40 p-3 text-sm text-destructive">{sheetError} <Button variant="outline" onClick={() => setRetry((value) => value + 1)}>Réessayer</Button></p>}
          {sheetLoading && <p role="status" className="text-sm text-muted-foreground">Chargement des élèves et des cotes…</p>}
          {sheet && <div className="overflow-hidden rounded-2xl border bg-card">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow className="bg-muted/50"><TableHead>Élève</TableHead><TableHead>Matricule</TableHead><TableHead>Cote / {maximum}</TableHead><TableHead>Enregistrée</TableHead><TableHead /></TableRow></TableHeader>
                <TableBody>
                  {students.map((student) => {
                    const grade = gradeByStudent.get(student.id_eleve)
                    const currentValue = grade ? String(Number(grade.valeur)) : ''
                    const value = drafts[student.id_eleve] ?? currentValue
                    const canEditGrade = editable && (!grade || user?.role === 'admin' || String(grade.id_user_saisie) === user?.id)
                    return <TableRow key={student.id_eleve}>
                      <TableCell className="font-medium">{student.prenom} {student.nom} {student.postnom}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{student.matricule}</TableCell>
                      <TableCell><Input type="number" min="0" max={Math.min(20, maximum)} step="0.25" value={value} disabled={!canEditGrade || !period}
                        onChange={(event) => setDrafts((current) => ({ ...current, [student.id_eleve]: event.target.value }))}
                        aria-label={`Cote de ${student.prenom} ${student.nom}`} className="h-9 w-28" /></TableCell>
                      <TableCell className="text-muted-foreground">{grade ? Number(grade.valeur).toFixed(2).replace('.', ',') : 'À saisir'}</TableCell>
                      <TableCell className="text-right">{canEditGrade && <Button size="sm" variant="outline" disabled={saving !== null || !period || (Boolean(grade) && value === currentValue)} onClick={() => void saveGrade(student.id_eleve)}><Save />Enregistrer</Button>}</TableCell>
                    </TableRow>
                  })}
                  {students.length === 0 && <TableRow><TableCell colSpan={5} className="py-12 text-center text-muted-foreground">Aucun élève inscrit dans cette classe pour cette année.</TableCell></TableRow>}
                </TableBody>
              </Table>
            </div>
          </div>}
        </>
      )}
    </>
  )
}
