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
  | 'dashboard'
  | 'eleves'
  | 'enseignants'
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
      { key: 'utilisateurs', label: 'Utilisateurs', href: '/utilisateurs', icon: ShieldCheck },
      { key: 'rapports', label: 'Rapports', href: '/rapports', icon: BarChart3 },
    ],
  },
]

export const ALL_NAV = NAV_GROUPS.flatMap((g) => g.items)

export const ROLE_LABELS: Record<Role, string> = {
  admin: 'Administrateur',
  directeur: 'Directeur',
  enseignant: 'Enseignant',
  comptable: 'Comptable',
  secretaire: 'Secrétaire',
}

type Access = 'edit' | 'read'

const ACCESS: Record<Role, Partial<Record<ModuleKey, Access>>> = {
  admin: Object.fromEntries(ALL_NAV.map((n) => [n.key, 'edit'])) as Record<ModuleKey, Access>,
  directeur: {
    ...(Object.fromEntries(ALL_NAV.map((n) => [n.key, 'edit'])) as Record<ModuleKey, Access>),
    utilisateurs: 'read',
  },
  enseignant: {
    dashboard: 'read',
    eleves: 'read',
    classes: 'read',
    cours: 'read',
    affectations: 'read',
    'emplois-du-temps': 'read',
    presences: 'edit',
    notes: 'edit',
    bulletins: 'read',
  },
  comptable: {
    dashboard: 'read',
    eleves: 'read',
    inscriptions: 'edit',
    frais: 'edit',
    depenses: 'edit',
    rapports: 'read',
  },
  secretaire: {
    dashboard: 'read',
    eleves: 'edit',
    enseignants: 'edit',
    classes: 'edit',
    cours: 'read',
    affectations: 'edit',
    'emplois-du-temps': 'edit',
    presences: 'edit',
    inscriptions: 'edit',
    bulletins: 'read',
  },
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
