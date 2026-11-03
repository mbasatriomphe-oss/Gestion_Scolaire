import type { AssessmentPeriod, Course, Database, Grade, Semester, Student } from './types'

export const SEMESTERS: Semester[] = ['S1', 'S2']
export const SEMESTER_LABELS: Record<Semester, string> = { S1: '1er semestre', S2: '2e semestre' }
export const PERIODS: AssessmentPeriod[] = ['P1', 'P2', 'EXAMEN']
export const PERIOD_LABELS: Record<AssessmentPeriod, string> = {
  P1: 'Première période',
  P2: 'Deuxième période',
  EXAMEN: 'Examen de fin de semestre',
}

const average = (values: number[]) => (values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null)
const scoreOnTwenty = (grade: Grade) => (grade.value / (grade.maxValue || 20)) * 20

function semesterAverage(values: Record<AssessmentPeriod, number | null>) {
  if (values.P1 === null || values.P2 === null || values.EXAMEN === null) return null
  return (values.P1 + values.P2 + 2 * values.EXAMEN) / 4
}

function gradeSemester(grade: Grade): Semester | null {
  if (grade.semester) return grade.semester
  if (grade.term === 'T1' || grade.term === 'T2') return 'S1'
  if (grade.term === 'T3') return 'S2'
  return null
}

function gradePeriod(grade: Grade): AssessmentPeriod | null {
  if (grade.period) return grade.period
  if (grade.type === 'Composition') return 'EXAMEN'
  if (grade.type === 'Interrogation') return 'P1'
  if (grade.type === 'Devoir') return grade.term === 'T2' || grade.term === 'T3' ? 'P2' : 'P1'
  return null
}

export interface StudentSemesterAverage {
  student: Student
  general: number | null
  complete: boolean
  rank: number | null
  classSize: number
}

export function studentSemesterAverages(data: Database, classId: string, semester: Semester) {
  const students = data.students.filter((student) => student.classId === classId)
  const studentIds = new Set(students.map((student) => student.id))
  const assignments = data.teachingAssignments?.filter((assignment) => assignment.classId === classId) ?? []
  const courseIds = [...new Set(assignments.map((assignment) => assignment.courseId))]
  const courses = data.courses.filter((course) => courseIds.includes(course.id))
  const gradesByKey = new Map<string, number[]>()

  for (const grade of data.grades) {
    if (!studentIds.has(grade.studentId) || gradeSemester(grade) !== semester) continue
    if (grade.classId && grade.classId !== classId) continue
    const period = gradePeriod(grade)
    if (!period) continue
    const key = `${grade.studentId}|${grade.courseId}|${period}`
    const grades = gradesByKey.get(key)
    if (grades) grades.push(scoreOnTwenty(grade))
    else gradesByKey.set(key, [scoreOnTwenty(grade)])
  }

  const result: StudentSemesterAverage[] = students.map((student) => {
    let weightedTotal = 0
    let totalCoefficients = 0
    let complete = courses.length > 0

    for (const course of courses) {
      const values = Object.fromEntries(PERIODS.map((period) => [
        period,
        average(gradesByKey.get(`${student.id}|${course.id}|${period}`) ?? []),
      ])) as Record<AssessmentPeriod, number | null>
      const courseAverage = semesterAverage(values)
      if (courseAverage === null) {
        complete = false
        continue
      }
      weightedTotal += courseAverage * course.coefficient
      totalCoefficients += course.coefficient
    }

    return {
      student,
      general: complete && totalCoefficients ? weightedTotal / totalCoefficients : null,
      complete,
      rank: null,
      classSize: 0,
    }
  })

  const ranked = [...result]
    .filter((item) => item.general !== null)
    .sort((a, b) => b.general! - a.general!)
  return result.map((item) => ({
    ...item,
    rank: item.general === null ? null : ranked.findIndex((entry) => entry.student.id === item.student.id) + 1,
    classSize: ranked.length,
  }))
}

export interface AnnualStudentResult {
  student: Student
  semester1: StudentSemesterAverage
  semester2: StudentSemesterAverage
  annual: number | null
  passed: boolean | null
}

export function annualClassResults(data: Database, classId: string): AnnualStudentResult[] {
  const first = new Map(studentSemesterAverages(data, classId, 'S1').map((item) => [item.student.id, item]))
  const second = new Map(studentSemesterAverages(data, classId, 'S2').map((item) => [item.student.id, item]))

  return data.students
    .filter((student) => student.classId === classId)
    .map((student) => {
      const semester1 = first.get(student.id)!
      const semester2 = second.get(student.id)!
      const annual =
        semester1.complete && semester2.complete && semester1.general !== null && semester2.general !== null
          ? (semester1.general + semester2.general) / 2
          : null
      return {
        student,
        semester1,
        semester2,
        annual,
        passed: annual === null ? null : annual > 10,
      }
    })
}

export interface CourseSemesterDetails {
  P1: number | null
  P2: number | null
  EXAMEN: number | null
  average: number | null
}

export function studentCourseYearDetails(data: Database, studentId: string, classId: string, courseId: string) {
  const semesterDetails = (semester: Semester): CourseSemesterDetails => {
    const grades = data.grades.filter((grade) =>
      grade.studentId === studentId &&
      grade.courseId === courseId &&
      (!grade.classId || grade.classId === classId) &&
      gradeSemester(grade) === semester,
    )
    const values = Object.fromEntries(
      PERIODS.map((period) => [
        period,
        average(grades.filter((grade) => gradePeriod(grade) === period).map(scoreOnTwenty)),
      ]),
    ) as Record<AssessmentPeriod, number | null>
    return {
      ...values,
      average: semesterAverage(values),
    }
  }

  const semester1 = semesterDetails('S1')
  const semester2 = semesterDetails('S2')
  return {
    semester1,
    semester2,
    annual: semester1.average !== null && semester2.average !== null
      ? (semester1.average + semester2.average) / 2
      : null,
  }
}

export const fmtGrade = (value: number | null | undefined) =>
  value === null || value === undefined ? '—' : value.toFixed(2).replace('.', ',')

export function studentTermAverages(data: Database, classId: string, _legacyTerm: 'T1' | 'T2' | 'T3') {
  return studentSemesterAverages(data, classId, 'S1')
}
