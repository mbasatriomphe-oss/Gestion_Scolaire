import { request } from './api'

export interface FinanceYear {
  id_annee: number
  libelle: string
  etat: 'ouverte' | 'cloturee'
}

export interface FinanceSemester {
  id_semestre: number
  id_annee: number
  ordre: number
  libelle: string
}

export interface FinanceClass {
  id_classe: number
  id_annee: number
  libelle: string
  montant_frais_annuel: number
}

export interface FinanceStudent {
  id_eleve: number
  matricule: string
  nom: string
  postnom: string
  prenom: string
}

export interface FinanceEnrollment {
  id_inscription: number
  id_eleve: number
  id_classe: number
  id_annee: number
  statut: string
}

export interface FinanceFee {
  id_frais: number
  id_classe: number
  id_semestre: number
  montant_du: number
}

export interface FinancePayment {
  id_paiement: number
  id_inscription: number
  id_frais: number
  montant: number
  date_paiement: string
  mode_paiement: 'espece' | 'cheque' | 'virement' | 'autre'
  reference_recu: string
  observation: string | null
  id_user_comptable: number
}

export interface FinanceExpense {
  id_depense: number
  id_annee: number
  libelle: string
  categorie: string
  montant: number
  date_depense: string
  beneficiaire: string | null
  reference_piece: string | null
  id_user_comptable: number
}

export interface FinanceBalance {
  annee: Pick<FinanceYear, 'id_annee' | 'libelle'> | null
  total_encaisse: number
  total_depenses: number
  solde: number
  montant_du: number
  reste_du: number
  semestres: Array<{
    id_semestre: number
    ordre: number
    libelle: string
    montant_du: number
    encaisse: number
    reste_du: number
  }>
  mensuel: Array<{ mois: string; encaisse: number; depenses: number }>
}

export interface FinanceDirectory {
  years: FinanceYear[]
  semesters: FinanceSemester[]
  classes: FinanceClass[]
  students: FinanceStudent[]
  enrollments: FinanceEnrollment[]
  fees: FinanceFee[]
  payments: FinancePayment[]
  expenses: FinanceExpense[]
}

interface Page<T> {
  data: T[]
  last_page: number
}

async function allPages<T>(path: string): Promise<T[]> {
  const rows: T[] = []
  for (let page = 1; ; page += 1) {
    const separator = path.includes('?') ? '&' : '?'
    const response = await request<Page<T>>(`${path}${separator}page=${page}`)
    rows.push(...response.data)
    if (page >= response.last_page) return rows
  }
}

export async function loadFinanceDirectory(): Promise<FinanceDirectory> {
  const [years, semesters, classes, students, enrollments, fees, payments, expenses] = await Promise.all([
    allPages<FinanceYear>('/annees-scolaires'),
    allPages<FinanceSemester>('/semestres'),
    allPages<FinanceClass>('/classes'),
    allPages<FinanceStudent>('/eleves'),
    allPages<FinanceEnrollment>('/inscriptions'),
    allPages<FinanceFee>('/frais-scolaires'),
    allPages<FinancePayment>('/paiements?per_page=100'),
    allPages<FinanceExpense>('/depenses?per_page=100'),
  ])
  return { years, semesters, classes, students, enrollments, fees, payments, expenses }
}

export async function loadExpenseDirectory(): Promise<Pick<FinanceDirectory, 'years' | 'expenses'>> {
  const [years, expenses] = await Promise.all([
    allPages<FinanceYear>('/annees-scolaires'),
    allPages<FinanceExpense>('/depenses?per_page=100'),
  ])
  return { years, expenses }
}

export function getFinanceBalance(yearId?: number) {
  return request<FinanceBalance>(`/finances/bilan${yearId ? `?annee_id=${yearId}` : ''}`)
}

export function createFinancePayment(payload: {
  id_inscription: number
  id_frais: number
  montant: number
  date_paiement: string
  mode_paiement: FinancePayment['mode_paiement']
  observation?: string | null
}) {
  return request<FinancePayment>('/paiements', { method: 'POST', body: JSON.stringify(payload) })
}

export function createFinanceExpense(payload: {
  id_annee: number
  libelle: string
  categorie: string
  montant: number
  date_depense: string
  beneficiaire?: string | null
  reference_piece?: string | null
}) {
  return request<FinanceExpense>('/depenses', { method: 'POST', body: JSON.stringify(payload) })
}
