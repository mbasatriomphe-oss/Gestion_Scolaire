'use client'

import { useState } from 'react'
import { KeyRound, Plus, ShieldCheck, Users } from 'lucide-react'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/app/confirm-dialog'
import { DataTable, type Column } from '@/components/app/data-table'
import { EntityFormDialog, type FieldConfig } from '@/components/app/entity-form-dialog'
import { PageHeader } from '@/components/app/page-header'
import { PersonCell } from '@/components/app/person-cell'
import { RowActions } from '@/components/app/row-actions'
import { StatCard } from '@/components/app/stat-card'
import { StatusBadge } from '@/components/app/status-badge'
import { Button } from '@/components/ui/button'
import { useCanEdit } from '@/hooks/use-permission'
import { useCrudState } from '@/hooks/use-crud-state'
import { formatDate } from '@/lib/format'
import { db, useCurrentUser, useDB } from '@/lib/store'
import { ROLE_LABELS } from '@/lib/permissions'
import type { AppUser, Role } from '@/lib/types'

const roleOptions = Object.entries(ROLE_LABELS).map(([value, label]) => ({ value, label }))

export default function UsersPage() {
  const data = useDB()!
  const currentUser = useCurrentUser()
  const editable = useCanEdit('utilisateurs')
  const crud = useCrudState<AppUser>()
  const [deleting, setDeleting] = useState<AppUser | null>(null)
  const user = crud.editing

  const fields: FieldConfig[] = [
    { name: 'name', label: 'Nom complet', required: true },
    {
      name: 'email',
      label: 'Adresse e-mail',
      type: 'email',
      required: true,
      validate: (value) => data.users.some((item) => item.email.toLowerCase() === value.toLowerCase() && item.id !== user?.id) ? 'Cette adresse e-mail est déjà utilisée.' : undefined,
    },
    { name: 'role', label: 'Rôle', type: 'select', required: true, options: roleOptions },
    { name: 'teacherId', label: 'Profil enseignant', type: 'select', options: [{ value: '', label: 'Aucun profil enseignant' }, ...data.teachers.map((teacher) => ({ value: teacher.id, label: `${teacher.firstName} ${teacher.lastName}` }))] },
    { name: 'password', label: user ? 'Nouveau mot de passe (laisser vide pour conserver)' : 'Mot de passe', type: 'password', required: !user },
    { name: 'status', label: 'Statut', type: 'select', required: true, options: [{ value: 'actif', label: 'Actif' }, { value: 'inactif', label: 'Désactivé' }] },
  ]

  const columns: Column<AppUser>[] = [
    { key: 'user', header: 'Utilisateur', sortValue: (item) => item.name, cell: (item) => <PersonCell name={item.name} sub={item.email} /> },
    { key: 'role', header: 'Rôle', sortValue: (item) => item.role, cell: (item) => ROLE_LABELS[item.role] },
    { key: 'lastLogin', header: 'Dernière connexion', sortValue: (item) => item.lastLogin ?? '', cell: (item) => item.lastLogin ? formatDate(item.lastLogin) : 'Jamais', className: 'text-muted-foreground' },
    { key: 'status', header: 'Statut', sortValue: (item) => item.status, cell: (item) => <StatusBadge status={item.status} /> },
    { key: 'actions', header: '', className: 'w-12', cell: (item) => <RowActions onEdit={editable ? () => crud.openEdit(item) : undefined} onDelete={editable && item.id !== currentUser?.id ? () => setDeleting(item) : undefined} /> },
  ]

  return (
    <>
      <PageHeader
        eyebrow="Administration"
        title="Utilisateurs"
        description="Gérez les comptes de démonstration et leurs rôles d’accès."
        actions={editable && <Button onClick={crud.openCreate}><Plus />Nouvel utilisateur</Button>}
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Comptes" value={String(data.users.length)} icon={Users} hint={`${data.users.filter((item) => item.status === 'actif').length} actifs`} />
        <StatCard label="Rôles disponibles" value={String(roleOptions.length)} icon={ShieldCheck} tone="gold" delay={60} />
        <StatCard label="Comptes enseignants" value={String(data.users.filter((item) => item.role === 'enseignant').length)} icon={KeyRound} tone="success" delay={120} />
      </div>
      {!editable && <p className="rounded-xl border bg-muted/40 p-3 text-sm text-muted-foreground">Vous pouvez consulter la liste, mais seuls les administrateurs peuvent modifier les comptes.</p>}
      <DataTable rows={data.users} columns={columns} getRowId={(item) => item.id} />
      <EntityFormDialog
        open={crud.formOpen}
        onOpenChange={crud.setFormOpen}
        title={user ? 'Modifier un utilisateur' : 'Nouvel utilisateur'}
        description="Simulation locale uniquement : les comptes seront gérés par l’API Laravel lors de son intégration."
        fields={fields}
        initial={{
          name: user?.name ?? '',
          email: user?.email ?? '',
          role: user?.role ?? 'secretaire',
          teacherId: user?.teacherId ?? '',
          password: '',
          status: user?.status ?? 'actif',
        }}
        onSubmit={(values) => {
          const role = values.role as Role
          if (role === 'enseignant' && !values.teacherId) return 'Un compte enseignant doit être lié à un profil enseignant.'
          const payload = {
            name: values.name,
            email: values.email,
            role,
            status: values.status as AppUser['status'],
            teacherId: values.teacherId || undefined,
          }
          if (user) {
            db.update('users', user.id, { ...payload, ...(values.password ? { password: values.password } : {}) })
            toast.success('Compte utilisateur mis à jour.')
          } else {
            db.add('users', { ...payload, password: values.password, lastLogin: null } as Omit<AppUser, 'id'>)
            toast.success('Compte utilisateur créé.')
          }
        }}
      />
      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
        description={`Supprimer le compte de ${deleting?.name ?? ''} ? Cette action est irréversible dans la simulation locale.`}
        onConfirm={() => {
          if (deleting) {
            db.remove('users', deleting.id)
            toast.success('Compte utilisateur supprimé.')
          }
          setDeleting(null)
        }}
      />
    </>
  )
}
