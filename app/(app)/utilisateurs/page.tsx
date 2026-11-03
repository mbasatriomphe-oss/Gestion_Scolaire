'use client'

import { useEffect, useState } from 'react'
import { KeyRound, Plus, ShieldCheck, Users } from 'lucide-react'
import { toast } from 'sonner'
import { DataTable, type Column } from '@/components/app/data-table'
import { EntityFormDialog, type FieldConfig } from '@/components/app/entity-form-dialog'
import { PageHeader } from '@/components/app/page-header'
import { PersonCell } from '@/components/app/person-cell'
import { StatCard } from '@/components/app/stat-card'
import { StatusBadge } from '@/components/app/status-badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { getApiErrorMessage, type ApiUser } from '@/lib/api'
import { formatDate } from '@/lib/format'
import { useCurrentUser } from '@/lib/store'
import { createAccountant, listUsers, setAccountActive } from '@/lib/users-api'

const roleLabels: Record<string, string> = {
  secretaire: 'Secrétaire',
  admin: 'Administrateur',
  enseignant: 'Enseignant',
  comptable: 'Comptable',
  eleve: 'Élève',
}

export default function UsersPage() {
  const currentUser = useCurrentUser()
  const [users, setUsers] = useState<ApiUser[]>([])
  const [createOpen, setCreateOpen] = useState(false)
  const [credentials, setCredentials] = useState<{ login: string; password: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reload, setReload] = useState(0)
  const [changingId, setChangingId] = useState<number | null>(null)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    listUsers()
      .then((records) => { if (active) setUsers(records) })
      .catch((reason: unknown) => { if (active) setError(getApiErrorMessage(reason)) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [reload])

  const fields: FieldConfig[] = [
    { name: 'role', label: 'Rôle', type: 'select', required: true, options: [{value:'comptable',label:'Comptable'}, {value:'secretaire',label:'Secrétaire'}] },
    { name: 'name', label: 'Nom complet', required: true },
    { name: 'login', label: 'Identifiant de connexion', required: true },
    { name: 'email', label: 'Adresse e-mail', type: 'email', required: true },
    { name: 'password', label: 'Mot de passe initial', type: 'password', required: true, validate: (value) => value.length < 8 ? 'Au moins 8 caractères.' : undefined },
    { name: 'passwordConfirmation', label: 'Confirmer le mot de passe', type: 'password', required: true, validate: (value, values) => value !== values.password ? 'Les mots de passe ne correspondent pas.' : undefined },
  ]
  const columns: Column<ApiUser>[] = [
    { key: 'user', header: 'Utilisateur', sortValue: (item) => item.nom_complet, cell: (item) => <PersonCell name={item.nom_complet} sub={item.login} /> },
    { key: 'email', header: 'E-mail', sortValue: (item) => item.email ?? '', cell: (item) => item.email ?? '—' },
    { key: 'role', header: 'Rôle', sortValue: (item) => item.role, cell: (item) => roleLabels[item.role] ?? item.role },
    { key: 'lastLogin', header: 'Dernière connexion', sortValue: (item) => item.derniere_connexion ?? '', cell: (item) => item.derniere_connexion ? formatDate(item.derniere_connexion) : 'Jamais' },
    { key: 'status', header: 'Statut', sortValue: (item) => item.actif ? 'actif' : 'inactif', cell: (item) => <StatusBadge status={item.actif ? 'actif' : 'inactif'} /> },
    { key: 'action', header: '', cell: (item) => ['comptable', 'secretaire'].includes(item.role) && String(item.id_user) !== currentUser?.id ? (
      <Button variant="ghost" size="sm" disabled={changingId === item.id_user} onClick={async () => {
        setChangingId(item.id_user)
        try {
          const updated = await setAccountActive(item.id_user, !item.actif)
          setUsers((records) => records.map((record) => record.id_user === item.id_user ? updated : record))
          toast.success(updated.actif ? 'Compte réactivé.' : 'Compte désactivé.')
        } catch (reason) {
          toast.error(getApiErrorMessage(reason))
        } finally {
          setChangingId(null)
        }
      }}>{item.actif ? 'Désactiver' : 'Réactiver'}</Button>
    ) : null },
  ]

  return (
    <>
      <PageHeader eyebrow="Administration" title="Utilisateurs" description="Comptes enregistrés dans la base de l’établissement. Les comptes enseignants et élèves sont créés avec leurs fiches." actions={
        currentUser?.role === 'admin' && <Button onClick={() => setCreateOpen(true)}><Plus />Nouvel utilisateur</Button>
      } />
      {loading && <p role="status" className="text-sm text-muted-foreground">Chargement des comptes…</p>}
      {error && <div role="alert" className="flex items-center justify-between gap-3 rounded-lg border border-destructive/40 p-4 text-sm text-destructive"><span>{error}</span><Button variant="outline" onClick={() => setReload((value) => value + 1)}>Réessayer</Button></div>}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Comptes" value={String(users.length)} icon={Users} hint={`${users.filter((item) => item.actif).length} actifs`} />
        <StatCard label="Comptables" value={String(users.filter((item) => item.role === 'comptable').length)} icon={ShieldCheck} tone="gold" delay={60} />
        <StatCard label="Enseignants" value={String(users.filter((item) => item.role === 'enseignant').length)} icon={KeyRound} tone="success" delay={120} />
      </div>
      {!loading && !error && <DataTable rows={users} columns={columns} getRowId={(item) => String(item.id_user)} />}

      <EntityFormDialog open={createOpen} onOpenChange={setCreateOpen} title="Nouveau compte" description="Choisissez les droits du comptable ou du secrétaire." fields={fields} initial={{ role: 'comptable', name: '', login: '', email: '', password: '', passwordConfirmation: '' }} onSubmit={async (values) => {
        const created = await createAccountant(values as { login: string; email: string; name: string; password: string; passwordConfirmation: string; role: string })
        setUsers((records) => [created, ...records])
        setCredentials({ login: values.login, password: values.password })
        toast.success('Compte créé.')
      }} />
      <Dialog open={Boolean(credentials) && !createOpen} onOpenChange={(open) => { if (!open) setCredentials(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Identifiants du compte</DialogTitle>
            <DialogDescription>Conservez ces identifiants maintenant. Le mot de passe initial ne sera plus affiché après fermeture.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 rounded-lg border p-4 text-sm">
            <p>Identifiant : <code className="select-all font-semibold">{credentials?.login}</code></p>
            <p>Mot de passe initial : <code className="select-all font-semibold">{credentials?.password}</code></p>
          </div>
          <Button onClick={() => setCredentials(null)}>J’ai conservé ces identifiants</Button>
        </DialogContent>
      </Dialog>
    </>
  )
}
