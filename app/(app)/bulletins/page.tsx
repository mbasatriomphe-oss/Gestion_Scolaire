'use client'

import { useMemo, useState } from 'react'
import { Download, FileText, GraduationCap, Printer, TrendingUp } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/app/page-header'
import { SimpleSelect } from '@/components/app/simple-select'
import { StatCard } from '@/components/app/stat-card'
import { annualClassResults, fmtGrade, studentCourseYearDetails } from '@/lib/academics'
import { downloadCSV, formatDate } from '@/lib/format'
import { useDB } from '@/lib/store'
import type { AssessmentPeriod } from '@/lib/types'

const reportPeriods: AssessmentPeriod[] = ['P1', 'P2', 'EXAMEN']

function scoreText(value: number | null) {
  return value === null ? '—' : fmtGrade(value)
}

export default function ReportCardsPage() {
  const data = useDB()!
  const [classId, setClassId] = useState(data.classes[0]?.id ?? '')
  const [studentId, setStudentId] = useState('')
  const klass = data.classes.find((item) => item.id === classId)
  const results = useMemo(() => annualClassResults(data, classId), [data, classId])
  const students = useMemo(
    () => [...results].sort((a, b) => a.student.lastName.localeCompare(b.student.lastName, 'fr')),
    [results],
  )
  const selected = results.find((item) => item.student.id === studentId) ?? students[0]
  const complete = results.filter((item) => item.annual !== null)
  const passed = results.filter((item) => item.passed === true).length
  const failed = results.filter((item) => item.passed === false).length
  const incomplete = results.length - complete.length
  const annualRanking = [...complete].sort((a, b) => (b.annual ?? 0) - (a.annual ?? 0))
  const rank = selected?.annual === null || selected?.annual === undefined
    ? null
    : annualRanking.findIndex((item) => item.student.id === selected.student.id) + 1
  const courses = useMemo(() => {
    const assignedIds = new Set(data.teachingAssignments.filter((item) => item.classId === classId).map((item) => item.courseId))
    return (assignedIds.size ? data.courses.filter((course) => assignedIds.has(course.id)) : data.courses)
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name, 'fr'))
  }, [data.courses, data.teachingAssignments, classId])
  const headTeacher = data.teachers.find((teacher) => teacher.id === klass?.headTeacherId)
  const attendance = selected
    ? data.attendance.filter((record) => record.studentId === selected.student.id && record.classId === classId)
    : []
  const absences = attendance.filter((record) => record.status === 'absent').length
  const justified = attendance.filter((record) => record.status === 'excusé').length
  const delays = attendance.filter((record) => record.status === 'retard').length

  const printBulletin = () => {
    if (!selected) return
    window.print()
  }

  return (
    <>
      <div className="no-print">
        <PageHeader
          eyebrow="Évaluations"
          title="Bulletins scolaires"
          description="Sélectionnez une classe et un élève pour consulter ou imprimer son bulletin annuel."
          actions={
            <>
              <SimpleSelect
                ariaLabel="Classe du bulletin"
                value={classId}
                onValueChange={(value) => { setClassId(value); setStudentId('') }}
                options={data.classes.map((item) => ({ value: item.id, label: `${item.name}${item.option ? ` · ${item.option}` : ''}` }))}
              />
              <SimpleSelect
                ariaLabel="Élève du bulletin"
                value={selected?.student.id ?? ''}
                onValueChange={setStudentId}
                options={students.map((item) => ({ value: item.student.id, label: `${item.student.lastName} ${item.student.firstName}` }))}
                placeholder="Choisir un élève"
              />
              <Button variant="outline" onClick={printBulletin} disabled={!selected}><Printer />Imprimer le bulletin</Button>
              <Button
                variant="outline"
                disabled={!results.length}
                onClick={() => {
                  downloadCSV(`resultats-${klass?.name ?? 'classe'}-${data.settings.schoolYear}.csv`, results.map((item) => ({
                    Matricule: item.student.matricule,
                    Élève: `${item.student.firstName} ${item.student.lastName}`,
                    Semestre1: item.semester1.general === null ? '' : fmtGrade(item.semester1.general),
                    Semestre2: item.semester2.general === null ? '' : fmtGrade(item.semester2.general),
                    MoyenneAnnuelle: item.annual === null ? '' : fmtGrade(item.annual),
                    Rang: item.annual === null ? '' : annualRanking.findIndex((entry) => entry.student.id === item.student.id) + 1,
                    Décision: item.passed === null ? 'Incomplet' : item.passed ? 'Admis' : 'Non admis',
                  })))
                  toast.success('Résultats de la classe exportés.')
                }}
              ><Download />Exporter la classe</Button>
            </>
          }
        />
        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Élèves de la classe" value={String(results.length)} icon={GraduationCap} />
          <StatCard label="Admis (> 10/20)" value={String(passed)} icon={TrendingUp} tone="success" delay={60} />
          <StatCard label="Non admis (≤ 10/20)" value={String(failed)} icon={FileText} tone="danger" delay={120} />
          <StatCard label="Bulletins incomplets" value={String(incomplete)} icon={FileText} tone="gold" delay={180} />
        </div>
        <div className="mt-4 rounded-xl border border-gold/30 bg-gold/5 p-4 text-sm">
          Modèle de bulletin annuel pour l’enseignement secondaire en RDC. Calcul de démonstration : moyenne simple des deux périodes et de l’examen dans chaque semestre, puis moyenne annuelle des deux semestres. Le passage est indicatif et fixé à plus de 10/20 selon la règle choisie pour cette simulation.
        </div>
      </div>

      {!selected ? (
        <div className="rounded-2xl border bg-card p-12 text-center text-sm text-muted-foreground">Aucun élève inscrit dans cette classe.</div>
      ) : (
        <article className="report-card mt-6 rounded-xl border-2 border-slate-800 bg-white p-5 text-slate-950 shadow-sm print:mt-0 print:rounded-none print:border print:p-3 print:shadow-none">
          <header className="grid grid-cols-[1fr_auto_1fr] items-start gap-3 border-b-2 border-slate-900 pb-3 text-center">
            <div className="text-left text-[10px] font-semibold leading-relaxed uppercase">
              <p>République Démocratique du Congo</p>
              <p>Ministère de l&apos;Éducation Nationale</p>
              <p>Enseignement primaire, secondaire et technique</p>
            </div>
            <div className="flex size-12 items-center justify-center rounded-full border-2 border-slate-800 text-xs font-bold">RDC</div>
            <div className="text-right text-[10px] leading-relaxed">
              <p className="font-bold uppercase">{data.settings.schoolName}</p>
              <p>Année scolaire : {data.settings.schoolYear}</p>
              <p>Document scolaire — simulation</p>
            </div>
          </header>

          <div className="py-2 text-center">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em]">Enseignement secondaire</p>
            <h1 className="mt-0.5 text-xl font-black uppercase tracking-wide">Bulletin annuel</h1>
            <p className="text-xs font-semibold">{klass?.level} {klass?.option ? `— Option ${klass.option}` : ''}</p>
          </div>

          <section className="grid grid-cols-2 gap-x-6 gap-y-1 border-y border-slate-500 py-2 text-[11px] sm:grid-cols-4">
            <Info label="Nom" value={selected.student.lastName.toUpperCase()} />
            <Info label="Post-nom et prénom" value={selected.student.firstName} />
            <Info label="Matricule" value={selected.student.matricule} />
            <Info label="Sexe" value={selected.student.gender === 'F' ? 'Féminin' : 'Masculin'} />
            <Info label="Date de naissance" value={formatDate(selected.student.birthDate)} />
            <Info label="Classe" value={klass?.name ?? '—'} />
            <Info label="Option" value={klass?.option || 'Cycle d’orientation'} />
            <Info label="Titulaire" value={headTeacher ? `${headTeacher.firstName} ${headTeacher.lastName}` : '—'} />
          </section>

          <div className="mt-3 overflow-hidden">
            <table className="report-table w-full table-fixed border-collapse text-[8px] leading-tight">
              <colgroup>
                <col className="w-[19%]" />
                <col className="w-[5%]" />
                {Array.from({ length: 8 }, (_, index) => <col key={index} className="w-[6%]" />)}
                <col className="w-[7%]" />
                <col className="w-[9%]" />
                <col className="w-[6%]" />
              </colgroup>
              <thead>
                <tr className="bg-slate-200 text-center font-bold uppercase">
                  <th rowSpan={2}>Branches / cours</th>
                  <th rowSpan={2}>Coef.</th>
                  <th colSpan={4}>Premier semestre</th>
                  <th colSpan={4}>Deuxième semestre</th>
                  <th rowSpan={2}>Moy. annuelle /20</th>
                  <th rowSpan={2}>Décision</th>
                  <th rowSpan={2}>%</th>
                </tr>
                <tr className="bg-slate-100 text-center font-semibold">
                  {['Période 1', 'Période 2', 'Examen', 'Moy./20', 'Période 1', 'Période 2', 'Examen', 'Moy./20'].map((label, index) => <th key={`${label}-${index}`}>{label}</th>)}
                </tr>
              </thead>
              <tbody>
                {courses.map((course) => {
                  const details = selected ? studentCourseYearDetails(data, selected.student.id, classId, course.id) : null
                  return (
                    <tr key={course.id}>
                      <td className="text-left font-medium">{course.name}</td>
                      <td>{course.coefficient}</td>
                      {reportPeriods.map((period) => <td key={`s1-${period}`}>{scoreText(details?.semester1[period] ?? null)}</td>)}
                      <td className="font-semibold">{scoreText(details?.semester1.average ?? null)}</td>
                      {reportPeriods.map((period) => <td key={`s2-${period}`}>{scoreText(details?.semester2[period] ?? null)}</td>)}
                      <td className="font-semibold">{scoreText(details?.semester2.average ?? null)}</td>
                      <td className="font-bold">{scoreText(details?.annual ?? null)}</td>
                      <td>{details?.annual === null || details?.annual === undefined ? '—' : details.annual > 10 ? 'Réussi' : 'Échec'}</td>
                      <td>{details?.annual === null || details?.annual === undefined ? '—' : `${fmtGrade(details.annual * 5)} %`}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <section className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Summary label="Moyenne du 1er semestre" value={selected.semester1.general === null ? 'Incomplète' : `${fmtGrade(selected.semester1.general)} / 20`} />
            <Summary label="Moyenne du 2e semestre" value={selected.semester2.general === null ? 'Incomplète' : `${fmtGrade(selected.semester2.general)} / 20`} />
            <Summary label="Moyenne annuelle" value={selected.annual === null ? 'Incomplète' : `${fmtGrade(selected.annual)} / 20`} />
            <Summary label="Place dans la classe" value={rank === null ? '—' : `${rank}${rank === 1 ? 'ère' : 'e'} / ${annualRanking.length}`} />
          </section>

          <section className="mt-2 grid grid-cols-2 gap-3 border border-slate-500 p-2 text-[10px] sm:grid-cols-4">
            <Info label="Absences non justifiées" value={String(absences)} />
            <Info label="Absences justifiées" value={String(justified)} />
            <Info label="Retards" value={String(delays)} />
            <Info label="Conduite" value="À compléter" />
          </section>

          <section className="mt-2 grid grid-cols-2 gap-3">
            <div className="border border-slate-500 p-2 text-[10px]">
              <p className="font-bold uppercase">Décision du conseil de classe</p>
              <p className="mt-2 font-semibold">
                {selected.passed === null ? 'Résultats incomplets — décision à compléter' : selected.passed ? 'Admis en classe supérieure' : 'Non admis'}
              </p>
              <p className="mt-1">Mention : {selected.annual === null ? '—' : mention(selected.annual)}</p>
            </div>
            <div className="border border-slate-500 p-2 text-[10px]">
              <p className="font-bold uppercase">Observations</p>
              <p className="mt-2 min-h-8">{selected.annual === null ? 'Bulletin à compléter.' : selected.annual > 10 ? 'Travail satisfaisant. Continuez les efforts.' : 'Des efforts supplémentaires sont nécessaires.'}</p>
            </div>
          </section>

          <footer className="mt-3 grid grid-cols-3 gap-4 text-center text-[10px]">
            <div><p>Le titulaire</p><p className="mt-9 border-t border-slate-500 pt-1">{headTeacher ? `${headTeacher.firstName} ${headTeacher.lastName}` : 'Signature'}</p></div>
            <div><p>Le parent / tuteur</p><p className="mt-9 border-t border-slate-500 pt-1">Signature</p></div>
            <div><p>Le chef d&apos;établissement</p><p className="mt-9 border-t border-slate-500 pt-1">Signature et cachet</p></div>
          </footer>
          <p className="mt-2 text-center text-[8px] italic">Bulletin généré par simulation. Le modèle, les règles de cotation et les mentions doivent être validés par l&apos;établissement avant usage officiel.</p>
        </article>
      )}
    </>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return <p><span className="font-semibold">{label} : </span>{value}</p>
}

function Summary({ label, value }: { label: string; value: string }) {
  return <div className="border border-slate-700 p-2 text-center"><p className="text-[9px] font-semibold uppercase">{label}</p><p className="mt-1 text-sm font-black">{value}</p></div>
}

function mention(average: number) {
  if (average >= 16) return 'Très bien'
  if (average >= 14) return 'Bien'
  if (average >= 12) return 'Assez bien'
  if (average > 10) return 'Satisfaisant'
  return 'Insuffisant'
}
