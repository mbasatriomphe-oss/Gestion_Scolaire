import { request } from './api'
import { listTeachers } from './teachers-api'
import type { Teacher } from './types'

interface Page<T> { data: T[]; last_page: number }

export async function schoolAll<T>(path: string): Promise<T[]> {
  const records: T[] = []
  for (let page = 1; ; page += 1) {
    const result = await request<Page<T>>(`${path}${path.includes('?') ? '&' : '?'}page=${page}`)
    records.push(...result.data)
    if (page >= result.last_page) return records
  }
}

export interface SchoolPeriod {
  id_periode: number
  id_semestre: number
  libelle: string
  type: 'periode' | 'examen'
  ordre: number
}

export interface SchoolSemester {
  id_semestre: number
  id_annee: number
  libelle: string
  ordre: number
  periodes: SchoolPeriod[]
}

export interface SchoolYear {
  id_annee: number
  libelle: string
  date_debut: string
  date_fin: string
  etat: 'ouverte' | 'cloturee'
  semestres: SchoolSemester[]
}

export interface SchoolCycle { id_cycle: number; libelle: string }
export interface SchoolLevel { id_niveau: number; id_cycle: number; libelle: string; ordre: number; necessite_option: boolean; options: SchoolOption[] }
export interface SchoolOption { id_option: number; libelle: string; actif: boolean }

export interface SchoolClassRecord {
  id_classe: number
  id_annee: number
  id_niveau: number
  id_option: number | null
  libelle: string
  modele_bulletin: 'examen_etat' | 'standard'
  salle: string | null
  montant_frais_annuel: number
  capacite: number | null
  actif: boolean
  inscriptions_count?: number
  annee_scolaire?: Pick<SchoolYear, 'id_annee' | 'libelle' | 'etat'>
  niveau?: Pick<SchoolLevel, 'id_niveau' | 'id_cycle' | 'libelle' | 'ordre' | 'necessite_option'> & { cycle?: SchoolCycle }
  option?: SchoolOption | null
  frais_scolaires?: Array<{ id_frais: number; id_semestre: number; montant_du: number; semestre?: { id_semestre: number; ordre: number; libelle: string } }>
}

export interface SchoolCourse {
  cycles?: SchoolCycle[]
  id_cours: number
  id_cycle: number
  code: string
  intitule: string
  domaine_bulletin: string | null
  sous_domaine_bulletin: string | null
  coefficient: number
  actif: boolean
  cycle?: SchoolCycle
}

export interface SchoolAssignment {
  id_affectation: number
  id_classe: number
  id_cours: number
  id_enseignant: number
  salle: string | null
  classe?: Pick<SchoolClassRecord, 'id_classe' | 'id_annee' | 'libelle' | 'salle'>
  cours?: Pick<SchoolCourse, 'id_cours' | 'intitule' | 'code' | 'coefficient' | 'id_cycle'>
  enseignant?: { id_enseignant: number; nom: string; postnom: string; prenom: string; actif: boolean }
}

export interface SchoolConfig {
  years: SchoolYear[]
  cycles: SchoolCycle[]
  levels: SchoolLevel[]
  options: SchoolOption[]
}

export async function loadSchoolConfig(): Promise<SchoolConfig> {
  const [years, cycles, levels, options] = await Promise.all([
    schoolAll<SchoolYear>('/annees-scolaires'),
    schoolAll<SchoolCycle>('/cycles'),
    schoolAll<SchoolLevel>('/niveaux'),
    schoolAll<SchoolOption>('/options'),
  ])
  return { years, cycles, levels, options }
}

export async function loadClasses() {
  const [config, classes] = await Promise.all([loadSchoolConfig(), schoolAll<SchoolClassRecord>('/classes')])
  return { ...config, classes }
}

export async function loadCourses() {
  const [cycles, courses] = await Promise.all([schoolAll<SchoolCycle>('/cycles'), schoolAll<SchoolCourse>('/cours')])
  return { cycles, courses }
}

export async function loadAssignments({ includeTeachers = true }: { includeTeachers?: boolean } = {}): Promise<{ assignments: SchoolAssignment[]; classes: SchoolClassRecord[]; courses: SchoolCourse[]; teachers: Teacher[] }> {
  const [assignments, classes, courses, teachers] = await Promise.all([
    schoolAll<SchoolAssignment>('/affectations-cours'),
    schoolAll<SchoolClassRecord>('/classes'),
    schoolAll<SchoolCourse>('/cours'),
    includeTeachers ? listTeachers() : Promise.resolve([]),
  ])
  return { assignments, classes, courses, teachers }
}

export const createSchoolYear = (data: { libelle: string; date_debut: string; date_fin: string; etat: 'ouverte' | 'cloturee' }) =>
  request<SchoolYear>('/annees-scolaires', { method: 'POST', body: JSON.stringify(data) })
export const updateSchoolYear = (id: number, data: { libelle: string; date_debut: string; date_fin: string; etat: 'ouverte' | 'cloturee' }) =>
  request<SchoolYear>(`/annees-scolaires/${id}`, { method: 'PUT', body: JSON.stringify(data) })

export const createSchoolCycle = (libelle: string) =>
  request<SchoolCycle>('/cycles', { method: 'POST', body: JSON.stringify({ libelle }) })
export interface SchoolLevelInput { id_cycle: number; libelle: string; ordre: number; necessite_option: boolean; option_ids: number[] }
export const createSchoolLevel = (data: SchoolLevelInput) =>
  request<SchoolLevel>('/niveaux', { method: 'POST', body: JSON.stringify(data) })
export const updateSchoolLevel = (id: number, data: SchoolLevelInput) =>
  request<SchoolLevel>(`/niveaux/${id}`, { method: 'PUT', body: JSON.stringify(data) })
export const createSchoolOption = (libelle: string) =>
  request<SchoolOption>('/options', { method: 'POST', body: JSON.stringify({ libelle, actif: true }) })

export interface SchoolClassInput {
  id_annee: number
  id_niveau: number
  id_option: number | null
  libelle: string
  modele_bulletin: 'examen_etat' | 'standard'
  salle: string
  montant_frais_annuel: number
  capacite: number | null
  actif: boolean
}
export const createSchoolClass = (data: SchoolClassInput) =>
  request<SchoolClassRecord>('/classes', { method: 'POST', body: JSON.stringify(data) })
export const updateSchoolClass = (id: number, data: SchoolClassInput) =>
  request<SchoolClassRecord>(`/classes/${id}`, { method: 'PUT', body: JSON.stringify(data) })
export const deleteSchoolClass = (id: number) => request<void>(`/classes/${id}`, { method: 'DELETE' })

export interface SchoolCourseInput {
  cycle_ids?: number[]
  id_cycle: number
  code: string
  intitule: string
  domaine_bulletin: string | null
  sous_domaine_bulletin: string | null
  coefficient: number
  actif: boolean
}
export const createSchoolCourse = (data: SchoolCourseInput) =>
  request<SchoolCourse>('/cours', { method: 'POST', body: JSON.stringify(data) })
export const updateSchoolCourse = (id: number, data: SchoolCourseInput) =>
  request<SchoolCourse>(`/cours/${id}`, { method: 'PUT', body: JSON.stringify(data) })
export const deleteSchoolCourse = (id: number) => request<void>(`/cours/${id}`, { method: 'DELETE' })

export interface SchoolAssignmentInput { id_classe: number; id_cours: number; id_enseignant: number; salle: string }
export const createSchoolAssignment = (data: SchoolAssignmentInput) =>
  request<SchoolAssignment>('/affectations-cours', { method: 'POST', body: JSON.stringify(data) })
export const updateSchoolAssignment = (id: number, data: SchoolAssignmentInput) =>
  request<SchoolAssignment>(`/affectations-cours/${id}`, { method: 'PUT', body: JSON.stringify(data) })
export const deleteSchoolAssignment = (id: number) => request<void>(`/affectations-cours/${id}`, { method: 'DELETE' })
