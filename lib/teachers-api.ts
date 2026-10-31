import { request } from './api'
import type { Teacher } from './types'

interface TeacherRecord {
  id_enseignant: number
  matricule: string
  nom: string
  postnom: string
  prenom: string
  sexe: 'M' | 'F' | null
  telephone: string | null
  email: string | null
  specialite: string | null
  salaire: number | string | null
  date_embauche: string | null
  statut: Teacher['status'] | null
  actif: boolean
}

interface TeacherPage {
  data: TeacherRecord[]
  current_page: number
  last_page: number
}

export interface TeacherCredentials {
  login: string
  mot_de_passe: string
}

export interface TeacherFormValues {
  firstName: string
  lastName: string
  postName: string
  gender: string
  email: string
  phone: string
  specialty: string
  hiredAt: string
  salary: string
  status: string
}

function toTeacher(record: TeacherRecord): Teacher {
  return {
    id: String(record.id_enseignant),
    matricule: record.matricule,
    firstName: record.prenom,
    lastName: record.nom,
    postName: record.postnom,
    gender: record.sexe ?? '',
    email: record.email ?? '',
    phone: record.telephone ?? '',
    specialty: record.specialite ?? '',
    hiredAt: record.date_embauche?.slice(0, 10) ?? '',
    salary: Number(record.salaire ?? 0),
    status: record.statut === 'congé' || record.statut === 'inactif'
      ? record.statut
      : record.actif ? 'actif' : 'inactif',
  }
}

function toPayload(values: TeacherFormValues) {
  return {
    prenom: values.firstName,
    nom: values.lastName,
    postnom: values.postName,
    sexe: values.gender,
    email: values.email,
    telephone: values.phone,
    specialite: values.specialty,
    date_embauche: values.hiredAt,
    salaire: Number(values.salary),
    statut: values.status,
  }
}

export async function listTeachers(signal?: AbortSignal): Promise<Teacher[]> {
  const teachers: Teacher[] = []
  let page = 1
  let lastPage = 1
  do {
    const response = await request<TeacherPage>(`/enseignants?page=${page}`, { signal })
    teachers.push(...response.data.map(toTeacher))
    lastPage = response.last_page
    page += 1
  } while (page <= lastPage)
  return teachers
}

export async function createTeacher(values: TeacherFormValues): Promise<{ teacher: Teacher; credentials: TeacherCredentials }> {
  const response = await request<{ enseignant: TeacherRecord; identifiants_initiaux: TeacherCredentials }>(
    '/enseignants',
    { method: 'POST', body: JSON.stringify(toPayload(values)) },
  )
  return { teacher: toTeacher(response.enseignant), credentials: response.identifiants_initiaux }
}

export async function updateTeacher(id: string, values: TeacherFormValues): Promise<Teacher> {
  const response = await request<TeacherRecord>(`/enseignants/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(toPayload(values)),
  })
  return toTeacher(response)
}

export async function deleteTeacher(id: string): Promise<void> {
  await request<void>(`/enseignants/${encodeURIComponent(id)}`, { method: 'DELETE' })
}
