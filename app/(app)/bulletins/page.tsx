'use client'

import { useCurrentUser } from '@/lib/store'

import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useSearchParams } from 'next/navigation'
import { Download, Printer, Settings2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { PageHeader } from '@/components/app/page-header'
import { SimpleSelect } from '@/components/app/simple-select'
import { CongoReportCard } from '@/components/reports/congo-report-card'
import { StateExamReportCard } from '@/components/reports/state-exam-report-card'
import { getApiErrorMessage } from '@/lib/api'
import { loadEstablishment, loadStudentBulletin, saveEstablishment, type EstablishmentDetails, type StudentBulletin } from '@/lib/bulletin-api'
import { downloadCSV } from '@/lib/format'
import { loadClassResults } from '@/lib/grading-api'
import { loadStudentDirectory, type StudentDirectory } from '@/lib/students-api'

const emptyEstablishment: EstablishmentDetails = {
  nom: '', numero_id: '', province_educationnelle: '', ville: '', commune: '', code: '',
}

const schoolFields: Array<{ key: keyof EstablishmentDetails; label: string; placeholder: string }> = [
  { key: 'nom', label: 'Nom de l’école', placeholder: 'Nom officiel de l’établissement' },
  { key: 'numero_id', label: 'N° ID', placeholder: 'Numéro d’identification' },
  { key: 'province_educationnelle', label: 'Province éducationnelle', placeholder: 'Province éducationnelle' },
  { key: 'ville', label: 'Ville', placeholder: 'Ville' },
  { key: 'commune', label: 'Commune / territoire', placeholder: 'Commune ou territoire' },
  { key: 'code', label: 'Code de l’école', placeholder: 'Code' },
]

export default function ReportCardsPage() {
  const isAdmin = useCurrentUser()?.role === 'admin'
  const searchParams = useSearchParams()
  const studentFromLink = searchParams.get('eleve') ?? ''
  const [directory, setDirectory] = useState<StudentDirectory | null>(null)
  const [establishment, setEstablishment] = useState<EstablishmentDetails>(emptyEstablishment)
  const [form, setForm] = useState<EstablishmentDetails>(emptyEstablishment)
  const [classId, setClassId] = useState(searchParams.get('classe') ?? '')
  const [studentId, setStudentId] = useState(studentFromLink)
  const [report, setReport] = useState<StudentBulletin | null>(null)
  const [loading, setLoading] = useState(true)
  const [reportLoading, setReportLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [error, setError] = useState('')
  const [reportError, setReportError] = useState('')
  const [retry, setRetry] = useState(0)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    Promise.all([loadStudentDirectory(), loadEstablishment()])
      .then(([loadedDirectory, loadedEstablishment]) => {
        if (!active) return
        setDirectory(loadedDirectory)
        setEstablishment(loadedEstablishment)
        setForm(loadedEstablishment)
      })
      .catch((cause: unknown) => { if (active) setError(getApiErrorMessage(cause)) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [retry])

  const yearsById = useMemo(() => new Map(directory?.years.map((year) => [year.id_annee, year]) ?? []), [directory])
  const classes = useMemo(() => [...(directory?.classes ?? [])]
    .sort((a, b) => {
      const left = yearsById.get(a.id_annee)
      const right = yearsById.get(b.id_annee)
      return (right?.date_debut ?? '').localeCompare(left?.date_debut ?? '') || a.libelle.localeCompare(b.libelle, 'fr')
    }), [directory?.classes, yearsById])
  const linkedEnrollment = directory?.enrollments.find((item) =>
    String(item.id_eleve) === studentFromLink && item.statut === 'actif' && classes.some((klass) => klass.id_classe === item.id_classe),
  )
  const selectedClass = classes.find((klass) => String(klass.id_classe) === classId)
    ?? classes.find((klass) => klass.id_classe === linkedEnrollment?.id_classe)
    ?? classes[0]
  const studentsById = useMemo(() => new Map(directory?.students.map((student) => [student.id_eleve, student]) ?? []), [directory])
  const students = useMemo(() => (directory?.enrollments ?? [])
    .filter((item) => item.id_classe === selectedClass?.id_classe && item.statut === 'actif')
    .map((item) => studentsById.get(item.id_eleve))
    .filter((student) => student !== undefined)
    .sort((a, b) => `${a.nom} ${a.postnom} ${a.prenom}`.localeCompare(`${b.nom} ${b.postnom} ${b.prenom}`, 'fr')),
  [directory?.enrollments, selectedClass?.id_classe, studentsById])
  const selectedStudent = studentId
    ? students.find((student) => String(student.id_eleve) === studentId)
    : students[0]

  useEffect(() => {
    if (!selectedClass || !selectedStudent) {
      setReport(null)
      return
    }
    const controller = new AbortController()
    setReport(null)
    setReportError('')
    setReportLoading(true)
    loadStudentBulletin(selectedStudent.id_eleve, selectedClass.id_classe, controller.signal)
      .then(setReport)
      .catch((cause: unknown) => { if (!controller.signal.aborted) setReportError(getApiErrorMessage(cause)) })
      .finally(() => { if (!controller.signal.aborted) setReportLoading(false) })
    return () => controller.abort()
  }, [selectedClass?.id_classe, selectedStudent?.id_eleve, retry])

  async function saveHeader(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    try {
      const saved = await saveEstablishment(form)
      setEstablishment(saved)
      setReport((current) => current ? { ...current, etablissement: saved } : current)
      setSettingsOpen(false)
      toast.success('En-tête du bulletin enregistré.')
    } catch (cause) {
      toast.error(getApiErrorMessage(cause))
    } finally {
      setSaving(false)
    }
  }

  async function exportClass() {
    if (!selectedClass) return
    try {
      const results = await loadClassResults(selectedClass.id_classe)
      if (results.eleves.length === 0) {
        toast.info('Aucun résultat à exporter pour cette classe.')
        return
      }
      const filename = `resultats-${selectedClass.libelle}-${results.annee.libelle}.csv`.replace(/[\\/:*?"<>|]/g, '-')
      downloadCSV(filename, results.eleves.map((item) => ({
        Matricule: item.eleve.matricule,
        Élève: [item.eleve.nom, item.eleve.postnom, item.eleve.prenom].filter(Boolean).join(' '),
        Semestre1: item.semestres.find((semester) => semester.ordre === 1)?.moyenne ?? '',
        Semestre2: item.semestres.find((semester) => semester.ordre === 2)?.moyenne ?? '',
        MoyenneAnnuelle: item.moyenne_annuelle ?? '',
        Pourcentage: item.pourcentage ?? '',
        Décision: item.reussi === null ? 'En attente' : item.reussi ? 'Réussi' : 'Échec',
      })))
      toast.success(`${results.eleves.length} résultat(s) exporté(s).`)
    } catch (cause) {
      toast.error(getApiErrorMessage(cause))
    }
  }

  return <>
    <div className="no-print space-y-5">
      <PageHeader eyebrow="Évaluations" title="Bulletins scolaires" description="Sélectionnez une classe et un élève, puis imprimez son bulletin annuel au format A4 portrait. Les cotes non saisies restent vides."
        actions={<>
          {isAdmin && <Button variant="outline" onClick={() => { setForm(establishment); setSettingsOpen(true) }} disabled={loading}><Settings2 />En-tête de l’école</Button>}
          <Button variant="outline" onClick={() => void exportClass()} disabled={!selectedClass}><Download />Exporter la classe</Button>
          <Button onClick={() => window.print()} disabled={!report || reportLoading}><Printer />Imprimer ce bulletin</Button>
        </>} />

      {error && <p role="alert" className="rounded-lg border border-destructive/40 p-3 text-sm text-destructive">{error} <Button variant="outline" onClick={() => setRetry((value) => value + 1)}>Réessayer</Button></p>}
      {loading && <p role="status" className="text-sm text-muted-foreground">Chargement des élèves et des classes…</p>}
      {!loading && !error && classes.length === 0 && <p className="rounded-lg border p-4 text-sm text-muted-foreground">Aucune classe n’est disponible. Créez d’abord une classe.</p>}
      {selectedClass && <div className="grid gap-3 rounded-2xl border bg-card p-4 sm:grid-cols-2">
        <div><label htmlFor="bulletin-class" className="mb-1.5 block text-xs font-medium text-muted-foreground">Classe et année scolaire</label>
          <SimpleSelect id="bulletin-class" value={String(selectedClass.id_classe)} onValueChange={(value) => { setClassId(value); setStudentId('') }}
            options={classes.map((klass) => ({ value: String(klass.id_classe), label: `${klass.libelle} · ${yearsById.get(klass.id_annee)?.libelle ?? 'Année inconnue'}${klass.actif ? '' : ' · inactive'}` }))} />
        </div>
        <div><label htmlFor="bulletin-student" className="mb-1.5 block text-xs font-medium text-muted-foreground">Élève</label>
          <SimpleSelect id="bulletin-student" value={String(selectedStudent?.id_eleve ?? '')} onValueChange={setStudentId} placeholder="Choisir un élève"
            options={students.map((student) => ({ value: String(student.id_eleve), label: `${student.nom} ${student.postnom} ${student.prenom} · ${student.matricule}` }))} />
        </div>
      </div>}
      {selectedClass && students.length === 0 && <p className="rounded-lg border p-4 text-sm text-muted-foreground">Aucun élève inscrit dans cette classe.</p>}
      {selectedClass && students.length > 0 && studentId && !selectedStudent && <p role="alert" className="rounded-lg border border-amber-500/40 p-3 text-sm">Cet élève n’a pas d’inscription active dans la classe sélectionnée. Choisissez un autre élève.</p>}
      {reportError && <p role="alert" className="rounded-lg border border-destructive/40 p-3 text-sm text-destructive">{reportError} <Button variant="outline" onClick={() => setRetry((value) => value + 1)}>Réessayer</Button></p>}
      {reportLoading && <p role="status" className="text-sm text-muted-foreground">Calcul du bulletin…</p>}
      {report && !report.complet && <p role="status" className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-3 text-sm">Ce bulletin est incomplet : les cases sans cote restent vides et la décision est en attente. Vous pouvez l’imprimer.</p>}
    </div>

    {report && <div className="report-preview">
      {report.classe.modele_bulletin === 'standard'
        ? <CongoReportCard report={report} />
        : <StateExamReportCard report={report} />}
    </div>}

    <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader><DialogTitle>En-tête de l’établissement</DialogTitle><DialogDescription>Ces informations apparaissent sur chaque bulletin. Laissez vide tout champ non disponible.</DialogDescription></DialogHeader>
        <form onSubmit={(event) => void saveHeader(event)} className="grid gap-4">
          {schoolFields.map((field) => <div key={field.key} className="grid gap-1.5">
            <label htmlFor={`school-${field.key}`} className="text-sm font-medium">{field.label}</label>
            <Input id={`school-${field.key}`} value={form[field.key]} placeholder={field.placeholder} maxLength={field.key === 'nom' ? 150 : 80}
              onChange={(event) => setForm((current) => ({ ...current, [field.key]: event.target.value }))} />
          </div>)}
          <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setSettingsOpen(false)}>Annuler</Button><Button type="submit" disabled={saving}>{saving ? 'Enregistrement…' : 'Enregistrer'}</Button></div>
        </form>
      </DialogContent>
    </Dialog>
  </>
}
