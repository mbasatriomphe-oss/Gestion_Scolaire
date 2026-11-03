import { request } from './api'

interface Page<T> {
  data: T[]
  last_page: number
}

export interface GradeAssignment {
  id_affectation: number
  id_classe: number
  id_cours: number
  id_enseignant: number
  salle: string | null
  classe: { id_classe: number; id_annee: number; libelle: string }
  cours: { id_cours: number; code: string; intitule: string; coefficient: number }
}

export interface GradePeriod {
  id_periode: number
  id_semestre: number
  ordre: number
  libelle: string
  type: 'periode' | 'examen'
}

export interface GradeSemester {
  id_semestre: number
  id_annee: number
  ordre: number
  libelle: string
  periodes: GradePeriod[]
}

export interface GradeStudent {
  id_eleve: number
  matricule: string
  nom: string
  postnom: string
  prenom: string
}

export interface GradeRecord {
  id_cote: number
  id_affectation: number
  id_periode: number
  id_eleve: number
  valeur: string | number
  date_saisie: string
  id_user_saisie: number
}

export interface GradeSheet {
  affectation: GradeAssignment
  semestres: GradeSemester[]
  eleves: GradeStudent[]
  cotes: GradeRecord[]
  baremes: Array<{ id_affectation: number; id_periode: number; bareme_max: string | number }>
}

export interface CoursePeriodResult {
  id_periode: number
  ordre: number
  type: 'periode' | 'examen'
  valeur: number | null
  maximum: number
  note_sur_20: number | null
}

export interface CourseSemesterResult {
  id_semestre: number
  ordre: number
  periodes: CoursePeriodResult[]
  moyenne: number | null
}

export interface CourseResult {
  id_affectation: number
  cours: { id_cours: number; code: string; intitule: string; coefficient: number }
  semestres: CourseSemesterResult[]
  moyenne_annuelle: number | null
}

export interface StudentResult {
  eleve: GradeStudent
  cours: CourseResult[]
  semestres: Array<{ id_semestre: number; ordre: number; moyenne: number | null }>
  moyenne_annuelle: number | null
  pourcentage: number | null
  complet: boolean
  reussi: boolean | null
}

export interface ClassResults {
  classe: { id_classe: number; libelle: string; id_annee: number }
  annee: { id_annee: number; libelle: string; etat: 'ouverte' | 'cloturee' }
  semestres: GradeSemester[]
  eleves: StudentResult[]
}

export async function listGradeAssignments(signal?: AbortSignal): Promise<GradeAssignment[]> {
  const assignments: GradeAssignment[] = []
  for (let page = 1; ; page += 1) {
    const result = await request<Page<GradeAssignment>>(`/affectations-cours?page=${page}`, { signal })
    assignments.push(...result.data)
    if (page >= result.last_page) return assignments
  }
}

export function loadGradeSheet(assignmentId: number, signal?: AbortSignal): Promise<GradeSheet> {
  return request<GradeSheet>(`/cotes/feuille/${assignmentId}`, { signal })
}

export function createGrade(payload: { id_affectation: number; id_periode: number; id_eleve: number; valeur: number }): Promise<GradeRecord> {
  return request<GradeRecord>('/cotes', { method: 'POST', body: JSON.stringify(payload) })
}

export function updateGrade(id: number, value: number): Promise<GradeRecord> {
  return request<GradeRecord>(`/cotes/${id}`, { method: 'PUT', body: JSON.stringify({ valeur: value }) })
}

export function loadClassResults(classId: number, signal?: AbortSignal): Promise<ClassResults> {
  return request<ClassResults>(`/resultats/classes/${classId}`, { signal })
}
