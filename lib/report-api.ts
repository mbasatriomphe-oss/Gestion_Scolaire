import { request } from './api'

interface Paginated<T> {
  data: T[]
  last_page: number
}

export interface ReportYear {
  id_annee: number
  libelle: string
  date_debut: string
  etat: 'ouverte' | 'cloturee'
}

export interface ReportPayment {
  id_paiement: number
  montant: number
  date_paiement: string
  reference_recu: string | null
  mode_paiement: string
}

export interface ReportExpense {
  id_depense: number
  libelle: string
  categorie: string
  montant: number
  date_depense: string
  reference_piece: string | null
}

async function allPages<T>(path: string): Promise<T[]> {
  const records: T[] = []
  for (let page = 1; ; page += 1) {
    const separator = path.includes('?') ? '&' : '?'
    const response = await request<Paginated<T>>(`${path}${separator}page=${page}`)
    records.push(...response.data)
    if (page >= response.last_page) return records
  }
}

export function listReportYears() {
  return allPages<ReportYear>('/annees-scolaires')
}

export async function loadReportTransactions(yearId: number) {
  const [payments, expenses] = await Promise.all([
    allPages<ReportPayment>(`/paiements?annee_id=${yearId}`),
    allPages<ReportExpense>(`/depenses?annee_id=${yearId}`),
  ])
  return { payments, expenses }
}
