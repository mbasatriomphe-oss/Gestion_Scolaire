import {
  BarChart3,
  BookOpen,
  CalendarCheck,
  CalendarDays,
  ClipboardList,
  ClipboardCheck,
  FileText,
  GraduationCap,
  LayoutDashboard,
  Receipt,
  School,
  ShieldCheck,
  UserPlus,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react'
import type { Role } from './types'

export type ModuleKey =
  | 'profil'
  | 'journal-audit'
  | 'dashboard'
  | 'eleves'
  | 'enseignants'
  | 'annees-scolaires'
  | 'classes'
  | 'cours'
  | 'affectations'
  | 'emplois-du-temps'
  | 'presences'
  | 'notes'
  | 'bulletins'
  | 'inscriptions'
  | 'frais'
  | 'depenses'
  | 'utilisateurs'
  | 'rapports'

export interface NavItem {
  key: ModuleKey
  label: string
  href: string
  icon: LucideIcon
}

export const NAV_GROUPS: Array<{ label: string; items: NavItem[] }> = [
  {
    label: 'Général',
    items: [{ key: 'dashboard', label: 'Tableau de bord', href: '/tableau-de-bord', icon: LayoutDashboard }],
  },
  {
    label: 'Scolarité',
    items: [
      { key: 'eleves', label: 'Élèves', href: '/eleves', icon: GraduationCap },
      { key: 'enseignants', label: 'Enseignants', href: '/enseignants', icon: Users },
      { key: 'annees-scolaires', label: 'Années scolaires', href: '/annees-scolaires', icon: CalendarDays },
      { key: 'classes', label: 'Classes', href: '/classes', icon: School },
      { key: 'cours', label: 'Cours', href: '/cours', icon: BookOpen },
      { key: 'affectations', label: 'Affectations', href: '/affectations', icon: ClipboardCheck },
      { key: 'emplois-du-temps', label: 'Emplois du temps', href: '/emplois-du-temps', icon: CalendarDays },
      { key: 'presences', label: 'Présences', href: '/presences', icon: CalendarCheck },
    ],
  },
  {
    label: 'Évaluations',
    items: [
      { key: 'notes', label: 'Notes', href: '/notes', icon: ClipboardList },
      { key: 'bulletins', label: 'Bulletins', href: '/bulletins', icon: FileText },
    ],
  },
  {
    label: 'Finances',
    items: [
      { key: 'inscriptions', label: 'Inscriptions', href: '/inscriptions', icon: UserPlus },
      { key: 'frais', label: 'Frais scolaires', href: '/frais', icon: Wallet },
      { key: 'depenses', label: 'Dépenses', href: '/depenses', icon: Receipt },
    ],
  },
  {
    label: 'Administration',
    items: [
      { key: 'profil', label: 'Mon profil', href: '/profil', icon: Users },
      { key: 'journal-audit', label: 'Journal des opérations', href: '/journal-audit', icon: ClipboardList },
      { key: 'utilisateurs', label: 'Utilisateurs', href: '/utilisateurs', icon: ShieldCheck },
      { key: 'rapports', label: 'Rapports', href: '/rapports', icon: BarChart3 },
    ],
  },
]

export const ALL_NAV = NAV_GROUPS.flatMap((g) => g.items)

export const ROLE_LABELS: Record<Role, string> = {
  eleve: 'Élève',
  admin: 'Administrateur',
  directeur: 'Directeur',
  enseignant: 'Enseignant',
  comptable: 'Comptable',
  secretaire: 'Secrétaire',
}

type Access = 'edit' | 'read'

const ACCESS: Record<Role, Partial<Record<ModuleKey, Access>>> = {
  eleve: { profil: 'edit' },
  admin: {
    profil: 'edit',
    'journal-audit': 'read',
    dashboard: 'read',
    eleves: 'edit',
    enseignants: 'edit',
    'annees-scolaires': 'edit',
    classes: 'edit',
    cours: 'edit',
    affectations: 'edit',
    notes: 'read',
    bulletins: 'read',
    inscriptions: 'edit',
    frais: 'edit',
    depenses: 'edit',
    utilisateurs: 'edit',
    rapports: 'read',
  },
  directeur: {},
  enseignant: {
    profil: 'edit',
    dashboard: 'read',
    classes: 'read',
    cours: 'read',
    affectations: 'read',
    notes: 'edit',
  },
  comptable: {
    profil: 'edit',
    dashboard: 'read',
    eleves: 'edit',
    inscriptions: 'edit',
    frais: 'edit',
    depenses: 'edit',
    rapports: 'read',
  },
  secretaire: { profil: 'edit', dashboard: 'read', eleves: 'edit', inscriptions: 'edit', notes: 'read', bulletins: 'read', classes: 'read', cours: 'read' },
}

export function canAccess(role: Role, key: ModuleKey) {
  return Boolean(ACCESS[role][key])
}

export function canEdit(role: Role, key: ModuleKey) {
  return ACCESS[role][key] === 'edit'
}

export function moduleFromPath(pathname: string): ModuleKey | null {
  const item = ALL_NAV.find((n) => pathname === n.href || pathname.startsWith(n.href + '/'))
  return item?.key ?? null
}
