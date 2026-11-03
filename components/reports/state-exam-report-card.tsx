import { Fragment } from 'react'
import type { BulletinCourseResult, StudentBulletin } from '@/lib/bulletin-api'

type Score = number | null
type Cell = Score | 'black'

const domainOrder = [
  'DOMAINE DES SCIENCES',
  'DOMAINE DES LANGUES',
  'DOMAINE DE L’UNIVERS SOCIAL ET ENVIRONNEMENT',
  'DOMAINE DU DÉVELOPPEMENT PERSONNEL',
  'AUTRES BRANCHES',
]

const subdomainOrder = [
  'Sous-domaines des Mathématiques',
  'Sous-domaines des sciences de la vie et de la Terre',
  'Sous-domaines des sciences physiques, Technologie et TIC',
]

function normalized(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('fr')
}

function inferredGrouping(name: string) {
  const subject = normalized(name)
  if (/education.*physique|sport|musique|theatre|\bart\b/.test(subject)) {
    return { domain: domainOrder[3], subdomain: '' }
  }
  if (/algebre|geometrie|probabilite|statistique|mathematique|dessin scientifique/.test(subject)) {
    return { domain: domainOrder[0], subdomain: subdomainOrder[0] }
  }
  if (/biolog|ecolog|geolog|evolution|sciences? de la vie/.test(subject)) {
    return { domain: domainOrder[0], subdomain: subdomainOrder[1] }
  }
  if (/chimie|physique|technolog|informatique|\btic\b/.test(subject)) {
    return { domain: domainOrder[0], subdomain: subdomainOrder[2] }
  }
  if (/francais|anglais|langue|latin|litterature/.test(subject)) {
    return { domain: domainOrder[1], subdomain: '' }
  }
  if (/geograph|histoire|philosoph|religion|education.*vie|education.*civ|morale|sociolog/.test(subject)) {
    return { domain: domainOrder[2], subdomain: '' }
  }
  return { domain: domainOrder[4], subdomain: '' }
}

function formatNumber(value: Score, digits = 2) {
  return value === null || !Number.isFinite(value)
    ? ''
    : new Intl.NumberFormat('fr-FR', { maximumFractionDigits: digits }).format(value)
}

function formatPercent(value: Score) {
  return value === null ? '' : `${formatNumber(value, Math.abs(value - 50) < 0.05 ? 6 : 2)} %`
}

function dateText(value: string | null | undefined) {
  if (!value) return ''
  const parts = value.match(/^(\d{4})-(\d{2})-(\d{2})/)
  return parts ? `${parts[3]}/${parts[2]}/${parts[1]}` : value
}

function boxes(value: string | null | undefined, minimum: number) {
  const letters = [...(value ?? '').replace(/\s/g, '')]
  const count = Math.max(minimum, letters.length)
  return <span className="state-exam-boxes" style={{ gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))` }}>
    {Array.from({ length: count }, (_, index) => <span key={index}>{letters[index] ?? ''}</span>)}
  </span>
}

function period(course: BulletinCourseResult, semester: number, order: number): Score {
  return course.semestres.find((item) => item.ordre === semester)
    ?.periodes.find((item) => item.ordre === order)?.points_bulletin ?? null
}

function semester(course: BulletinCourseResult, order: number): Score {
  return course.semestres.find((item) => item.ordre === order)?.total_bulletin ?? null
}

function courseScores(course: BulletinCourseResult): Score[] {
  return [period(course, 1, 1), period(course, 1, 2), period(course, 1, 3), semester(course, 1),
    period(course, 2, 1), period(course, 2, 2), period(course, 2, 3), semester(course, 2),
    course.total_annuel_bulletin]
}

function completeSum(values: Score[]): Score {
  return values.length > 0 && values.every((value) => value !== null)
    ? values.reduce<number>((sum, value) => sum + (value ?? 0), 0)
    : null
}

function summedScores(courses: BulletinCourseResult[]): Score[] {
  return Array.from({ length: 9 }, (_, index) =>
    completeSum(courses.map((course) => courseScores(course)[index])))
}

function maxScores(coefficient: number): number[] {
  return [10, 10, 20, 40, 10, 10, 20, 40, 80].map((base) => base * coefficient)
}

function detailedCells(coefficient: number, scores: Score[]): Cell[] {
  const maximum = maxScores(coefficient)
  return [maximum[0], scores[0], scores[1], maximum[2], scores[2], scores[3],
    maximum[4], scores[4], scores[5], maximum[6], scores[6], scores[7], scores[8]]
}

function Cells({ values, percent = false }: { values: Cell[]; percent?: boolean }) {
  return <>{values.map((value, index) => <td key={index}
    className={`${value === 'black' ? 'state-exam-black' : ''}${index === 12 ? ' state-exam-annual' : ''}`}>
    {value === 'black' ? '' : percent ? formatPercent(value) : formatNumber(value)}
  </td>)}</>
}

function scoreRow(courses: BulletinCourseResult[]) {
  const coefficient = courses.reduce((sum, course) => sum + Number(course.cours.coefficient), 0)
  return detailedCells(coefficient, summedScores(courses))
}

function groupedCourses(courses: BulletinCourseResult[]) {
  const domains = new Map<string, Map<string, BulletinCourseResult[]>>()
  for (const course of courses) {
    const inferred = inferredGrouping(course.cours.intitule)
    const domain = course.cours.domaine_bulletin?.trim() || inferred.domain
    const subdomain = course.cours.sous_domaine_bulletin?.trim() ||
      (course.cours.domaine_bulletin?.trim() ? '' : inferred.subdomain)
    const subgroups = domains.get(domain) ?? new Map<string, BulletinCourseResult[]>()
    subgroups.set(subdomain, [...(subgroups.get(subdomain) ?? []), course])
    domains.set(domain, subgroups)
  }
  return [...domains.entries()]
    .sort(([a], [b]) => (domainOrder.indexOf(a) < 0 ? 99 : domainOrder.indexOf(a))
      - (domainOrder.indexOf(b) < 0 ? 99 : domainOrder.indexOf(b)) || a.localeCompare(b, 'fr'))
    .map(([domain, subgroups]) => ({
      domain,
      subgroups: [...subgroups.entries()]
        .sort(([a], [b]) => (subdomainOrder.indexOf(a) < 0 ? 99 : subdomainOrder.indexOf(a))
          - (subdomainOrder.indexOf(b) < 0 ? 99 : subdomainOrder.indexOf(b)) || a.localeCompare(b, 'fr')),
    }))
}

function gradePercentages(scores: Score[], maximum: number[]): Cell[] {
  const percentage = (score: Score, max: number) => score === null || max <= 0 ? null : score / max * 100
  return ['black', percentage(scores[0], maximum[0]), percentage(scores[1], maximum[1]), 'black',
    percentage(scores[2], maximum[2]), percentage(scores[3], maximum[3]),
    'black', percentage(scores[4], maximum[4]), percentage(scores[5], maximum[5]), 'black',
    percentage(scores[6], maximum[6]), percentage(scores[7], maximum[7]),
    percentage(scores[8], maximum[8])]
}

export function StateExamReportCard({ report }: { report: StudentBulletin }) {
  const courses = report.cours
  const groups = groupedCourses(courses)
  const coefficient = courses.reduce((sum, course) => sum + Number(course.cours.coefficient), 0)
  const scores = summedScores(courses)
  const maximum = maxScores(coefficient)
  const percentages = gradePercentages(scores, maximum)
  percentages[12] = report.pourcentage
  const studentName = [report.eleve.nom, report.eleve.postnom, report.eleve.prenom].filter(Boolean).join(' ')
  const classTitle = [report.classe.niveau?.libelle || report.classe.libelle, report.classe.option?.libelle]
    .filter(Boolean).join(' / ')
  const emptyRows = Math.max(0, 20 - courses.length)

  return <article className={`report-card state-exam-card${courses.length > 25 ? ' state-exam-card-dense' : ''}`}
    aria-label={`Bulletin de ${studentName}`}>
    <div className="bulletin-masthead">
      <div className="bulletin-flag" role="img" aria-label="Drapeau de la République démocratique du Congo"><span>★</span></div>
      <div className="bulletin-republic">RÉPUBLIQUE DÉMOCRATIQUE DU CONGO<br />MINISTÈRE DE L’ÉDUCATION NATIONALE<br />ET NOUVELLE CITOYENNETÉ</div>
      <div className="bulletin-seal" aria-hidden="true"><span>RDC</span><b className="bulletin-seal-mark">★</b></div>
    </div>
    <div className="bulletin-id-line"><strong>N° ID.</strong>{boxes(report.etablissement.numero_id, 25)}</div>
    <div className="bulletin-province"><strong>PROVINCE ÉDUCATIONNELLE :</strong> {report.etablissement.province_educationnelle}</div>
    <div className="bulletin-identity">
      <div><strong>VILLE :</strong> <span>{report.etablissement.ville}</span></div>
      <div><strong>ÉLÈVE :</strong> <span>{studentName}</span> <strong>SEXE :</strong> {report.eleve.sexe ?? ''}</div>
      <div><strong>COMMUNE / TER. :</strong> <span>{report.etablissement.commune}</span></div>
      <div><strong>NÉ(E) À :</strong> <span>{report.eleve.lieu_naissance ?? ''}</span> <strong>LE :</strong> {dateText(report.eleve.date_naissance)}</div>
      <div><strong>ÉCOLE :</strong> <span>{report.etablissement.nom}</span></div>
      <div><strong>CLASSE :</strong> <span>{report.classe.libelle}</span></div>
      <div><strong>CODE :</strong> {boxes(report.etablissement.code, 10)}</div>
      <div><strong>N° PERM. :</strong> {boxes(report.eleve.matricule, 16)}</div>
    </div>
    <div className="state-exam-caption">BULLETIN DE LA {classTitle.toUpperCase()} <span>ANNÉE SCOLAIRE {report.annee.libelle}</span></div>
    <div className="state-exam-layout">
      <table className="state-exam-table" aria-label={`Cotes de ${studentName} pour ${report.annee.libelle}`}>
        <colgroup><col className="state-exam-branch-col" />
          {Array.from({ length: 12 }, (_, index) => <col key={index} className="state-exam-score-col" />)}
          <col className="state-exam-general-col" />
        </colgroup>
        <thead>
          <tr><th rowSpan={3}>BRANCHES</th><th colSpan={6}>PREMIER SEMESTRE</th><th colSpan={6}>SECOND SEMESTRE</th><th rowSpan={3}>TOTAL<br />GÉNÉRAL</th></tr>
          <tr><th colSpan={3}>TRAVAUX JOURNALIERS</th><th colSpan={2}>EXAMEN</th><th rowSpan={2}>TOTAL</th>
            <th colSpan={3}>TRAVAUX JOURNALIERS</th><th colSpan={2}>EXAMEN</th><th rowSpan={2}>TOTAL</th></tr>
          <tr><th>MAX</th><th>1<sup>re</sup> P.</th><th>2<sup>e</sup> P.</th><th>MAX</th><th>EXAM.</th>
            <th>MAX</th><th>3<sup>e</sup> P.</th><th>4<sup>e</sup> P.</th><th>MAX</th><th>EXAM.</th></tr>
        </thead>
        <tbody>
          {groups.map(({ domain, subgroups }) => <Fragment key={domain}>
            <tr className="state-exam-domain"><th colSpan={14}>{domain}</th></tr>
            {subgroups.map(([subdomain, section]) => <Fragment key={`${domain}-${subdomain}`}>
              {subdomain && <tr className="state-exam-subdomain"><th colSpan={14}>{subdomain}</th></tr>}
              {section.map((course) => <tr key={course.id_affectation} className="state-exam-course-row">
                <th>{course.cours.intitule}</th><Cells values={detailedCells(Number(course.cours.coefficient), courseScores(course))} />
              </tr>)}
              <tr className="state-exam-subtotal"><th>Sous-Total</th><Cells values={scoreRow(section)} /></tr>
            </Fragment>)}
          </Fragment>)}
          {courses.length === 0 && <tr className="state-exam-course-row"><th>Cours à affecter</th><Cells values={Array(13).fill(null)} /></tr>}
          {Array.from({ length: emptyRows }, (_, index) => <tr className="state-exam-empty-row" key={index}>
            <td /><Cells values={Array(13).fill(null)} />
          </tr>)}
          <tr className="state-exam-summary"><th>MAXIMA GÉNÉRAUX</th><Cells values={[
            maximum[0], 'black', 'black', maximum[2], 'black', maximum[3],
            maximum[4], 'black', 'black', maximum[6], 'black', maximum[7], maximum[8],
          ]} /></tr>
          <tr className="state-exam-summary"><th>TOTAUX</th><Cells values={[
            'black', scores[0], scores[1], 'black', scores[2], scores[3],
            'black', scores[4], scores[5], 'black', scores[6], scores[7], scores[8],
          ]} /></tr>
          <tr className="state-exam-summary"><th>POURCENTAGE</th><Cells values={percentages} percent /></tr>
          <tr className="state-exam-summary"><th>PLACE / NBRE ÉLÈVES</th><td colSpan={12} className="state-exam-slashes">/ &nbsp; / &nbsp;&nbsp;&nbsp;&nbsp; / &nbsp; /</td>
            <td>{report.rang !== null && report.nombre_eleves ? `${report.rang} / ${report.nombre_eleves}` : ''}</td></tr>
          <tr className="state-exam-summary"><th>APPLICATION</th><td colSpan={13} /></tr>
          <tr className="state-exam-summary"><th>CONDUITE</th><td colSpan={13} /></tr>
          <tr className="state-exam-summary"><th>SIGNATURE</th><td colSpan={13} /></tr>
        </tbody>
      </table>
      <aside className="state-exam-panel" aria-label="Examen d’État">
        <strong className="state-exam-panel-title">EXAMEN D’ÉTAT</strong>
        <div className="state-exam-panel-grid"><span>MEC</span><span>Points<br />Obt.</span><span>MAX</span><span>%</span><span /><span /></div>
        <p>Pour le contrôle<br />le........................</p>
        <p>Nom et signature du Chef de centre<br />........................................<br />........................................</p>
        <strong>Code du Centre</strong>{boxes('', 5)}
        <strong>RÉSULTAT FINAL</strong>
        <p>Diplômé (1)<br />Avec........ %<br />À échoué (1)</p>
        <div className="state-exam-panel-bottom">
          <p>Pour témoignage</p><p>Le...../...../........</p>
          <p>Le Chef d’établissement</p><p>Sceau de l’école</p>
        </div>
      </aside>
    </div>
    <div className="state-exam-footer">
      {report.complet && <p className="state-exam-school-result">Résultat annuel : {report.reussi ? 'passe' : 'double'} — {formatPercent(report.pourcentage)}</p>}
      {!report.complet && <p className="state-exam-school-result">Cotes incomplètes : décision annuelle en attente.</p>}
      <p className="state-exam-made-at">Fait à {report.etablissement.ville || '........................'} le ...../...../..........</p>
      <div className="state-exam-signatures"><span>Signature de l’élève</span><span>Sceau de l’école</span><span>Le Chef d’établissement<br />Nom et signature</span></div>
      <small>(1) Biffer la mention inutile.<br />Note importante : Le bulletin est sans valeur s’il est raturé ou surchargé.</small>
    </div>
  </article>
}
