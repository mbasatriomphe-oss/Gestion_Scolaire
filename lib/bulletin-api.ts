import { request } from './api'
import type { CoursePeriodResult, CourseResult, CourseSemesterResult, GradeSemester, GradeStudent } from './grading-api'

export type BulletinPeriodResult = CoursePeriodResult & {
  maximum_bulletin: number
  points_bulletin: number | null
}

export type BulletinSemesterResult = Omit<CourseSemesterResult, 'periodes'> & {
  periodes: BulletinPeriodResult[]
  maximum_bulletin: number
  total_bulletin: number | null
}

export type BulletinCourseResult = Omit<CourseResult, 'semestres' | 'cours'> & {
  cours: CourseResult['cours'] & {
    domaine_bulletin: string | null
    sous_domaine_bulletin: string | null
  }
  semestres: BulletinSemesterResult[]
  maximum_annuel_bulletin: number
  total_annuel_bulletin: number | null
}

export interface EstablishmentDetails {
  nom: string
  numero_id: string
  province_educationnelle: string
  ville: string
  commune: string
  code: string
}

export interface StudentBulletin {
  classe: {
    id_classe: number
    libelle: string
    id_annee: number
    modele_bulletin: 'examen_etat' | 'standard'
    niveau: { id_niveau: number; libelle: string } | null
    option: { id_option: number; libelle: string } | null
  }
  annee: { id_annee: number; libelle: string; etat: 'ouverte' | 'cloturee' }
  eleve: GradeStudent & { sexe: 'M' | 'F'; date_naissance: string; lieu_naissance: string | null }
  semestres: GradeSemester[]
  cours: BulletinCourseResult[]
  moyenne_annuelle: number | null
  pourcentage: number | null
  complet: boolean
  reussi: boolean | null
  rang: number | null
  nombre_eleves: number
  etablissement: EstablishmentDetails
}

export function loadEstablishment(signal?: AbortSignal) {
  return request<EstablishmentDetails>('/bulletins/etablissement', { signal })
}

export function saveEstablishment(details: EstablishmentDetails) {
  return request<EstablishmentDetails>('/bulletins/etablissement', {
    method: 'PUT',
    body: JSON.stringify(details),
  })
}

export function loadStudentBulletin(studentId: number, classId: number, signal?: AbortSignal) {
  return request<StudentBulletin>(`/bulletins/eleves/${studentId}?id_classe=${classId}`, { signal })
}
