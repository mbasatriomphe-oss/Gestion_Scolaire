import { request } from './api'
import type { SchoolClass, Student } from './types'

export interface ApiStudent {
  id_eleve: number
  matricule: string
  nom: string
  postnom: string
  prenom: string
  sexe: 'M' | 'F'
  date_naissance: string
  lieu_naissance: string | null
  adresse: string | null
  telephone: string | null
  nom_tuteur: string | null
  email: string | null
  actif: boolean
  created_at: string
}

export interface ApiClass {
  id_classe: number
  id_annee: number
  libelle: string
  capacite: number | null
  montant_frais_annuel: number | null
  actif: boolean
}

export interface ApiSchoolYear {
  id_annee: number
  libelle: string
  date_debut: string
  etat: 'ouverte' | 'cloturee'
}

export interface ApiEnrollment {
  id_inscription: number
  id_eleve: number
  id_classe: number
  id_annee: number
  date_inscription: string
  statut: 'actif' | 'abandon' | 'exclu'
}

export interface StudentProfilePayload {
  nom: string
  postnom: string
  prenom: string
  sexe: 'M' | 'F'
  date_naissance: string
  lieu_naissance: string | null
  adresse: string | null
  telephone: string | null
  nom_tuteur: string | null
  email: string | null
  actif: boolean
}

export interface StudentPayload extends StudentProfilePayload {
  id_classe?: number
  id_annee?: number
  date_inscription?: string
}

export interface StudentDirectory {
  students: ApiStudent[]
  classes: ApiClass[]
  years: ApiSchoolYear[]
  enrollments: ApiEnrollment[]
}

interface Paginated<T> {
  data: T[]
  current_page: number
  last_page: number
}

async function allPages<T>(path: string): Promise<T[]> {
  const records: T[] = []
  for (let page = 1; ; page += 1) {
    const response = await request<Paginated<T>>(`${path}?page=${page}`)
    records.push(...response.data)
    if (page >= response.last_page) return records
  }
}

export async function loadStudentDirectory(): Promise<StudentDirectory> {
  const [students, classes, years, enrollments] = await Promise.all([
    allPages<ApiStudent>('/eleves'),
    allPages<ApiClass>('/classes'),
    allPages<ApiSchoolYear>('/annees-scolaires'),
    allPages<ApiEnrollment>('/inscriptions'),
  ])
  return { students, classes, years, enrollments }
}

export function updateStudent(id: string, payload: StudentPayload) {
  return request<ApiStudent>(`/eleves/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export function createStudent(payload: StudentPayload) {
  return request<{
    eleve: ApiStudent
    inscription: ApiEnrollment | null
    identifiants_initiaux: { login: string; mot_de_passe: string }
  }>('/eleves', { method: 'POST', body: JSON.stringify(payload) })
}

export function latestEnrollment(directory: StudentDirectory, studentId: number) {
  const openYears = new Set(directory.years.filter((year) => year.etat === 'ouverte').map((year) => year.id_annee))
  const byYear = new Map(directory.years.map((year) => [year.id_annee, year]))
  return directory.enrollments
    .filter((item) => item.id_eleve === studentId)
    .sort((a, b) =>
      Number(openYears.has(b.id_annee)) - Number(openYears.has(a.id_annee)) ||
      (byYear.get(b.id_annee)?.date_debut ?? '').localeCompare(byYear.get(a.id_annee)?.date_debut ?? ''),
    )[0]
}

export function toLocalStudent(
  student: ApiStudent,
  enrollment: ApiEnrollment | undefined,
): Student {
  return {
    id: String(student.id_eleve),
    matricule: student.matricule,
    firstName: student.prenom,
    lastName: student.nom,
    middleName: student.postnom,
    gender: student.sexe,
    birthDate: student.date_naissance.slice(0, 10),
    birthPlace: student.lieu_naissance ?? '',
    classId: enrollment ? String(enrollment.id_classe) : '',
    parentName: student.nom_tuteur ?? '',
    parentPhone: student.telephone ?? '',
    email: student.email ?? '',
    address: student.adresse ?? '',
    status: student.actif ? 'actif' : 'inactif',
    enrolledAt: enrollment?.date_inscription.slice(0, 10) ?? student.created_at.slice(0, 10),
  }
}

export function toLocalClass(klass: ApiClass): SchoolClass {
  return {
    id: String(klass.id_classe),
    name: klass.libelle,
    level: klass.libelle,
    room: '',
    capacity: klass.capacite ?? Number.MAX_SAFE_INTEGER,
    headTeacherId: '',
    annualTuition: klass.montant_frais_annuel ?? 0,
    stage: 'orientation',
    option: '',
  }
}
