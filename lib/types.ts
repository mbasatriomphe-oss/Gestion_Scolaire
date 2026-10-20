export type Role = 'admin' | 'directeur' | 'enseignant' | 'comptable' | 'secretaire'
export type Gender = 'M' | 'F'
export type Term = 'T1' | 'T2' | 'T3'

export interface Student {
  id: string
  matricule: string
  firstName: string
  lastName: string
  gender: Gender
  birthDate: string
  classId: string
  parentName: string
  parentPhone: string
  email: string
  address: string
  status: 'actif' | 'inactif' | 'suspendu'
  enrolledAt: string
}

export interface Teacher {
  id: string
  firstName: string
  lastName: string
  gender: Gender
  email: string
  phone: string
  specialty: string
  status: 'actif' | 'congé' | 'inactif'
  hiredAt: string
  salary: number
}

export interface SchoolClass {
  id: string
  name: string
  level: string
  room: string
  capacity: number
  headTeacherId: string
}

export interface Course {
  id: string
  code: string
  name: string
  coefficient: number
  hoursPerWeek: number
  teacherId: string
  color: string
}

export interface TimetableEntry {
  id: string
  classId: string
  courseId: string
  day: number
  start: string
  end: string
  room: string
}

export interface Grade {
  id: string
  studentId: string
  courseId: string
  term: Term
  type: 'Devoir' | 'Interrogation' | 'Composition'
  value: number
  date: string
}

export interface Attendance {
  id: string
  studentId: string
  classId: string
  date: string
  status: 'présent' | 'absent' | 'retard' | 'excusé'
}

export interface Enrollment {
  id: string
  studentId: string
  classId: string
  schoolYear: string
  date: string
  type: 'Nouvelle' | 'Réinscription'
  status: 'en attente' | 'validée' | 'rejetée'
  fee: number
}

export interface Payment {
  id: string
  reference: string
  studentId: string
  category: 'Scolarité' | 'Inscription' | 'Cantine' | 'Transport' | 'Tenue'
  amount: number
  method: 'Espèces' | 'Mobile Money' | 'Virement' | 'Chèque'
  date: string
  status: 'payé' | 'en attente' | 'annulé'
}

export interface Expense {
  id: string
  label: string
  category: 'Salaires' | 'Fournitures' | 'Maintenance' | 'Électricité & Eau' | 'Transport' | 'Événements' | 'Autres'
  amount: number
  date: string
  supplier: string
  method: 'Espèces' | 'Mobile Money' | 'Virement' | 'Chèque'
  status: 'payée' | 'en attente'
}

export interface AppUser {
  id: string
  name: string
  email: string
  password: string
  role: Role
  status: 'actif' | 'inactif'
  lastLogin: string | null
  teacherId?: string
}

export interface AppNotification {
  id: string
  title: string
  message: string
  type: 'paiement' | 'absence' | 'inscription' | 'note' | 'systeme'
  createdAt: string
  read: boolean
}

export interface Database {
  version: number
  students: Student[]
  teachers: Teacher[]
  classes: SchoolClass[]
  courses: Course[]
  timetable: TimetableEntry[]
  grades: Grade[]
  attendance: Attendance[]
  enrollments: Enrollment[]
  payments: Payment[]
  expenses: Expense[]
  users: AppUser[]
  notifications: AppNotification[]
  session: { userId: string } | null
  settings: { schoolName: string; schoolYear: string; currency: string; tuitionByLevel: Record<string, number> }
}

export type CollectionKey = {
  [K in keyof Database]: Database[K] extends Array<{ id: string }> ? K : never
}[keyof Database]

export type EntityOf<K extends CollectionKey> = Database[K][number]
