import { request } from './api'

export interface SchoolSummary {
  annee: { id_annee: number; libelle: string } | null
  eleves_actifs: number
  eleves_inscrits: number
  enseignants_actifs: number
  classes_actives: number
  cours_actifs: number
  mes_affectations: number | null
}

export interface FinanceSummary {
  annee: { id_annee: number; libelle: string } | null
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

export function getSchoolSummary() {
  return request<SchoolSummary>('/tableau-de-bord')
}

export function getFinanceSummary(yearId?: number) {
  const query = yearId === undefined ? '' : `?annee_id=${yearId}`
  return request<FinanceSummary>(`/finances/bilan${query}`)
}
