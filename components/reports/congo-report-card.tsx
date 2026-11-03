import type { BulletinCourseResult, StudentBulletin } from '@/lib/bulletin-api'

function printNumber(value: number | null | undefined, digits = 2) {
  if (value === null || value === undefined || !Number.isFinite(value)) return ''
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: digits }).format(value)
}

function printPercent(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) return ''
  return `${printNumber(value, Math.abs(value - 50) < 0.05 ? 6 : 2)} %`
}

function dateParts(value: string | null | undefined) {
  if (!value) return ''
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/)
  return match ? `${match[3]}/${match[2]}/${match[1]}` : value
}

function boxes(value: string | null | undefined, count: number) {
  const characters = [...(value ?? '').replace(/\s/g, '')]
  const boxCount = Math.max(count, characters.length)
  return <span className="bulletin-boxes" style={{ gridTemplateColumns: `repeat(${boxCount}, minmax(0, 1fr))` }}>
    {Array.from({ length: boxCount }, (_, index) => <span key={index}>{characters[index] ?? ''}</span>)}
  </span>
}

function periodPoints(course: BulletinCourseResult, semesterOrder: number, periodOrder: number) {
  const period = course.semestres.find((semester) => semester.ordre === semesterOrder)?.periodes.find((item) => item.ordre === periodOrder)
  return period?.points_bulletin ?? null
}

function semesterPoints(course: BulletinCourseResult, semesterOrder: number) {
  return course.semestres.find((semester) => semester.ordre === semesterOrder)?.total_bulletin ?? null
}

function annualPoints(course: BulletinCourseResult) {
  return course.total_annuel_bulletin
}

function sumComplete(values: Array<number | null>) {
  return values.length > 0 && values.every((value) => value !== null)
    ? values.reduce<number>((total, value) => total + (value ?? 0), 0)
    : null
}

function maxima(coefficient: number) {
  return [10, 10, 20, 40, 10, 10, 20, 40, 80].map((base) => base * coefficient)
}

// Conserve l'ordre des branches du modèle quand l'établissement utilise ces intitulés.
const modelBranchOrder = [
  /^religion/, /^educationalavie/, /^(edciv|educationcivique)/,
  /^biologie/, /^dessin/, /^educationmusicale/, /^educationphysique/, /^geographie/,
  /^histoire/, /^informatique/, /^languesnationales/, /^sociologieafricaine/,
  /^travauxmusicaux?/, /^chimie/, /^mathematiques/, /^pedagogie/,
  /^physique/, /^psychologie/, /^anglais/, /^francais/,
]

function branchOrder(name: string) {
  const normalized = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('fr').replace(/[^a-z]/g, '')
  const order = modelBranchOrder.findIndex((pattern) => pattern.test(normalized))
  return order < 0 ? Number.MAX_SAFE_INTEGER : order
}

function coursePoints(course: BulletinCourseResult) {
  return [
    periodPoints(course, 1, 1), periodPoints(course, 1, 2), periodPoints(course, 1, 3), semesterPoints(course, 1),
    periodPoints(course, 2, 1), periodPoints(course, 2, 2), periodPoints(course, 2, 3), semesterPoints(course, 2),
    annualPoints(course),
  ]
}

function ScoreCells({ values, percent = false }: { values: Array<number | null>; percent?: boolean }) {
  return <>{values.map((value, index) => <td key={index} className={index === 8 ? 'bulletin-general-total' : undefined}>
    {percent ? printPercent(value) : printNumber(value)}
  </td>)}<td /><td /></>
}

export function CongoReportCard({ report }: { report: StudentBulletin }) {
  const courses = [...report.cours].sort((a, b) =>
    Number(a.cours.coefficient) - Number(b.cours.coefficient)
    || branchOrder(a.cours.intitule) - branchOrder(b.cours.intitule)
    || a.cours.intitule.localeCompare(b.cours.intitule, 'fr'),
  )
  const groups = new Map<number, BulletinCourseResult[]>()
  for (const course of courses) {
    const coefficient = Number(course.cours.coefficient)
    groups.set(coefficient, [...(groups.get(coefficient) ?? []), course])
  }
  const totalCoefficient = courses.reduce((sum, course) => sum + Number(course.cours.coefficient), 0)
  const overallMaximum = maxima(totalCoefficient)
  const totals = overallMaximum.map((_, index) => sumComplete(courses.map((course) => coursePoints(course)[index])))
  const percentages = totals.map((total, index) => total === null || overallMaximum[index] <= 0 ? null : total / overallMaximum[index] * 100)
  percentages[8] = report.pourcentage
  const name = [report.eleve.nom, report.eleve.postnom, report.eleve.prenom].filter(Boolean).join(' ')
  const classTitle = [report.classe.niveau?.libelle || report.classe.libelle, report.classe.option?.libelle]
    .filter(Boolean).join(' / ')
  const blankRows = Math.max(0, 20 - courses.length)

  return <article className={`report-card${courses.length > 22 ? ' report-card-dense' : ''}`} aria-label={`Bulletin de ${name}`}>
    <div className="bulletin-masthead">
      <div className="bulletin-flag" role="img" aria-label="Drapeau de la République démocratique du Congo"><span>★</span></div>
      <div className="bulletin-republic">RÉPUBLIQUE DÉMOCRATIQUE DU CONGO<br />MINISTÈRE DE L’ÉDUCATION NATIONALE<br />ET NOUVELLE CITOYENNETÉ</div>
      <div className="bulletin-seal" aria-hidden="true"><span>RDC</span><b className="bulletin-seal-mark">★</b></div>
    </div>

    <div className="bulletin-id-line"><strong>N° ID.</strong>{boxes(report.etablissement.numero_id, 23)}</div>
    <div className="bulletin-province"><strong>PROVINCE ÉDUCATIONNELLE :</strong> {report.etablissement.province_educationnelle}</div>
    <div className="bulletin-identity">
      <div><strong>VILLE :</strong> <span>{report.etablissement.ville}</span></div>
      <div><strong>ÉLÈVE :</strong> <span>{name}</span> <strong>SEXE :</strong> {report.eleve.sexe ?? ''}</div>
      <div><strong>COMMUNE / TER. :</strong> <span>{report.etablissement.commune}</span></div>
      <div><strong>NÉ(E) À :</strong> <span>{report.eleve.lieu_naissance ?? ''}</span> <strong>LE :</strong> {dateParts(report.eleve.date_naissance)}</div>
      <div><strong>ÉCOLE :</strong> <span>{report.etablissement.nom}</span></div>
      <div><strong>CLASSE :</strong> <span>{report.classe.libelle}</span></div>
      <div><strong>CODE :</strong> {boxes(report.etablissement.code, 10)}</div>
      <div><strong>N° PERM. :</strong> {boxes(report.eleve.matricule, 15)}</div>
    </div>

    <table className="report-table" aria-label={`Cotes de ${name} pour ${report.annee.libelle}`}>
      <colgroup>
        <col className="bulletin-branch-col" />
        {Array.from({ length: 8 }, (_, index) => <col key={index} className="bulletin-score-col" />)}
        <col className="bulletin-total-col" /><col className="bulletin-repechage-col" /><col className="bulletin-signature-col" />
      </colgroup>
      <thead>
        <tr><th colSpan={12} className="bulletin-caption">BULLETIN DE LA {classTitle.toUpperCase()} <span>ANNÉE SCOLAIRE {report.annee.libelle}</span></th></tr>
        <tr><th rowSpan={3}>BRANCHES</th><th colSpan={4}>PREMIER SEMESTRE</th><th colSpan={4}>SECOND SEMESTRE</th><th rowSpan={3}>T.G.</th><th colSpan={2}>EXAMEN DE REPÊCHAGE</th></tr>
        <tr><th colSpan={2}>TR. JOURN.</th><th rowSpan={2}>EXAM.</th><th rowSpan={2}>TOT.</th><th colSpan={2}>TR. JOURN.</th><th rowSpan={2}>EXAM.</th><th rowSpan={2}>TOT.</th><th rowSpan={2}>%</th><th rowSpan={2}>SIGN. PROF.</th></tr>
        <tr><th>1<sup>re</sup> P.</th><th>2<sup>e</sup> P.</th><th>3<sup>e</sup> P.</th><th>4<sup>e</sup> P.</th></tr>
      </thead>
      <tbody>
        {[...groups.entries()].map(([coefficient, section]) => <FragmentGroup key={coefficient} coefficient={coefficient} courses={section} />)}
        {courses.length === 0 && <tr><th className="bulletin-empty-hint">Cours à affecter</th><ScoreCells values={Array(9).fill(null)} /></tr>}
        {Array.from({ length: blankRows }, (_, index) => <tr key={`blank-${index}`} className="bulletin-blank-row"><td /><ScoreCells values={Array(9).fill(null)} /></tr>)}
        <tr className="bulletin-summary bulletin-summary-shaded"><th>MAXIMA GÉNÉRAUX</th><ScoreCells values={overallMaximum.map((value) => totalCoefficient ? value : null)} /></tr>
        <tr className="bulletin-summary bulletin-summary-shaded"><th>TOTAUX</th><ScoreCells values={totals} /></tr>
        <tr className="bulletin-summary bulletin-summary-shaded"><th>POURCENTAGE</th><ScoreCells values={percentages} percent /></tr>
        <tr className="bulletin-summary"><th>PLACE / NBRE D’ÉLÈVES</th><td colSpan={8} /><td>{report.rang !== null && report.nombre_eleves ? `${report.rang} / ${report.nombre_eleves}` : ''}</td><td colSpan={2} /></tr>
        <tr className="bulletin-summary"><th>APPLICATION</th><td colSpan={11} /></tr>
        <tr className="bulletin-summary"><th>CONDUITE</th><td colSpan={11} /></tr>
      </tbody>
    </table>

    <div className="bulletin-decision">
      <div><strong>Signature du responsable</strong><span className="bulletin-sign-line" /></div>
      <div className="bulletin-decision-choices">
        <span>{report.complet && report.reussi === true ? '☑' : '☐'} PASSE (1)</span>
        <span>{report.complet && report.reussi === false ? '☑' : '☐'} DOUBLÉ (1)</span>
        {!report.complet && <strong>Cotes incomplètes : décision en attente.</strong>}
      </div>
    </div>
    <div className="bulletin-footer">
      <p>• L’élève ne pourra passer dans la classe supérieure s’il n’a subi avec succès un examen de repêchage en <span className="bulletin-fill" />.</p>
      <p>• L’élève passe dans la classe supérieure (1) &nbsp; • L’élève double sa classe (1)</p>
      <p className="bulletin-made-at">Fait à {report.etablissement.ville || '………………………………'} le ……… / ……… / ……………</p>
      <div className="bulletin-signatures"><span>Signature de l’élève</span><span>Sceau de l’École</span><span>Chef d’Établissement<br />Noms et Signature</span></div>
      <small>(1) Biffer la mention inutile. Le bulletin est sans valeur s’il est raturé ou surchargé.</small>
      <strong className="bulletin-law">Interdiction formelle de reproduire ce bulletin sous peine des sanctions prévues par la loi</strong>
    </div>
  </article>
}

function FragmentGroup({ coefficient, courses }: { coefficient: number; courses: BulletinCourseResult[] }) {
  return <>
    <tr className="bulletin-maxima"><th>MAXIMA</th><ScoreCells values={maxima(coefficient)} /></tr>
    {courses.map((course) => <tr key={course.id_affectation}>
      <th className="bulletin-course-name">{course.cours.intitule}</th>
      <ScoreCells values={coursePoints(course)} />
    </tr>)}
  </>
}
