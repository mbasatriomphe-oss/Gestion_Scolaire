import type { Course, Database, Grade, Student, Term } from './types'

export const TERMS: Term[] = ['T1', 'T2', 'T3']
export const TERM_LABELS: Record<Term, string> = { T1: '1er trimestre', T2: '2e trimestre', T3: '3e trimestre' }
export const DAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi']

const avg = (values: number[]) => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : null)

export function courseAverage(grades: Grade[]) {
  const comps = grades.filter((g) => g.type === 'Composition').map((g) => g.value)
  const others = grades.filter((g) => g.type !== 'Composition').map((g) => g.value)
  const cc = avg(others)
  const comp = avg(comps)
  if (cc === null && comp === null) return null
  if (cc === null) return comp
  if (comp === null) return cc
  return (cc + comp * 2) / 3
}

export interface ReportLine {
  course: Course
  average: number | null
  weighted: number | null
  classAverage: number | null
  min: number | null
  max: number | null
  appreciation: string
}

export function appreciation(n: number | null) {
  if (n === null) return '—'
  if (n >= 16) return 'Excellent'
  if (n >= 14) return 'Très bien'
  if (n >= 12) return 'Bien'
  if (n >= 10) return 'Assez bien'
  if (n >= 8) return 'Insuffisant'
  return 'Très insuffisant'
}

export function mention(n: number | null) {
  if (n === null) return '—'
  if (n >= 16) return 'Félicitations'
  if (n >= 14) return "Tableau d'honneur + Encouragements"
  if (n >= 12) return "Tableau d'honneur"
  if (n >= 10) return 'Passable'
  return 'Avertissement travail'
}

export function studentTermAverages(data: Database, classId: string, term: Term) {
  const students = data.students.filter((s) => s.classId === classId)
  const ids = new Set(students.map((s) => s.id))
  const byStudentCourse = new Map<string, Grade[]>()
  for (const g of data.grades) {
    if (g.term !== term || !ids.has(g.studentId)) continue
    const key = `${g.studentId}|${g.courseId}`
    const list = byStudentCourse.get(key)
    if (list) list.push(g)
    else byStudentCourse.set(key, [g])
  }
  const result = students.map((s) => {
    let total = 0
    let coefs = 0
    const perCourse: Record<string, number | null> = {}
    for (const c of data.courses) {
      const a = courseAverage(byStudentCourse.get(`${s.id}|${c.id}`) ?? [])
      perCourse[c.id] = a
      if (a !== null) {
        total += a * c.coefficient
        coefs += c.coefficient
      }
    }
    return { student: s, perCourse, general: coefs ? total / coefs : null }
  })
  const ranked = [...result].filter((r) => r.general !== null).sort((a, b) => b.general! - a.general!)
  return result.map((r) => ({ ...r, rank: r.general === null ? null : ranked.indexOf(r) + 1, classSize: ranked.length }))
}

export function buildReportCard(data: Database, student: Student, term: Term) {
  const rows = studentTermAverages(data, student.classId, term)
  const me = rows.find((r) => r.student.id === student.id)!
  const lines: ReportLine[] = data.courses.map((course) => {
    const values = rows.map((r) => r.perCourse[course.id]).filter((v): v is number => v !== null)
    const average = me.perCourse[course.id]
    return {
      course,
      average,
      weighted: average === null ? null : average * course.coefficient,
      classAverage: avg(values),
      min: values.length ? Math.min(...values) : null,
      max: values.length ? Math.max(...values) : null,
      appreciation: appreciation(average),
    }
  })
  const generals = rows.map((r) => r.general).filter((v): v is number => v !== null)
  return {
    lines,
    general: me.general,
    rank: me.rank,
    classSize: me.classSize,
    classAverage: avg(generals),
    best: generals.length ? Math.max(...generals) : null,
    mention: mention(me.general),
  }
}

export const fmtGrade = (n: number | null | undefined) => (n === null || n === undefined ? '—' : n.toFixed(2).replace('.', ','))
