'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { BookOpen, DoorOpen, Pencil, Plus, Trash2, Users } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/app/confirm-dialog'
import { EntityFormDialog, type FieldConfig } from '@/components/app/entity-form-dialog'
import { PageHeader } from '@/components/app/page-header'
import { SimpleSelect } from '@/components/app/simple-select'
import { matches, Toolbar } from '@/components/app/toolbar'
import { getApiErrorMessage } from '@/lib/api'
import { formatMoney } from '@/lib/format'
import { useCurrentUser } from '@/lib/store'
import {
  createSchoolClass, deleteSchoolClass, loadClasses, updateSchoolClass,
  type SchoolClassRecord, type SchoolConfig,
} from '@/lib/school-api'

type ClassDirectory = SchoolConfig & { classes: SchoolClassRecord[] }

export default function ClassesPage() {
  const user = useCurrentUser()
  const admin = user?.role === 'admin'
  const [directory, setDirectory] = useState<ClassDirectory | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [yearFilter, setYearFilter] = useState('all')
  const [editing, setEditing] = useState<SchoolClassRecord | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [deleting, setDeleting] = useState<SchoolClassRecord | null>(null)

  const refresh = useCallback(async () => {
    const next = await loadClasses()
    setDirectory(next)
    setError('')
  }, [])
  useEffect(() => {
    void refresh().catch((cause: unknown) => setError(getApiErrorMessage(cause))).finally(() => setLoading(false))
  }, [refresh])

  const years = directory?.years ?? []
  const levels = directory?.levels ?? []
  const options = directory?.options ?? []
  const classes = directory?.classes ?? []
  const yearById = useMemo(() => new Map(years.map((year) => [year.id_annee, year])), [years])
  const levelById = useMemo(() => new Map(levels.map((level) => [level.id_niveau, level])), [levels])
  const optionById = useMemo(() => new Map(options.map((option) => [option.id_option, option])), [options])
  const rows = classes.filter((klass) =>
    (yearFilter === 'all' || String(klass.id_annee) === yearFilter) &&
    matches(search, klass.libelle, klass.salle, levelById.get(klass.id_niveau)?.libelle, optionById.get(klass.id_option ?? -1)?.libelle),
  )

  const fields: FieldConfig[] = [
    { name: 'id_annee', label: 'Année scolaire', type: 'select', required: true, options: years.filter((year) => editing ? year.id_annee === editing.id_annee : year.etat === 'ouverte').map((year) => ({ value: String(year.id_annee), label: year.libelle })) },
    { name: 'id_niveau', label: 'Niveau', type: 'select', required: true, resetOnChange: ['id_option'], options: levels.map((level) => ({ value: String(level.id_niveau), label: `${directory?.cycles.find((cycle) => cycle.id_cycle === level.id_cycle)?.libelle ?? 'Cycle'} · ${level.libelle}` })) },
    { name: 'libelle', label: 'Nom de la classe', required: true, placeholder: '1re A' },
    { name: 'modele_bulletin', label: 'Modèle du bulletin', type: 'select', required: true, options: [
      { value: 'examen_etat', label: 'Bulletin congolais avec domaines et examen d’État' },
      { value: 'standard', label: 'Bulletin congolais classique' },
    ] },
    { name: 'id_option', label: 'Option du niveau', type: 'select', visible: (values) => Boolean(levels.find((item) => String(item.id_niveau) === values.id_niveau)?.necessite_option), options: (values) => {
      const level = levels.find((item) => String(item.id_niveau) === values.id_niveau)
      const associated = new Set(level?.options?.map((option) => option.id_option) ?? [])
      return options.filter((option) => (associated.has(option.id_option) && option.actif) || (level?.id_niveau === editing?.id_niveau && option.id_option === editing?.id_option)).map((option) => ({ value: String(option.id_option), label: option.libelle }))
    }, validate: (value, values) => {
      const level = levels.find((item) => String(item.id_niveau) === values.id_niveau)
      if (level?.necessite_option && !value) return 'Ce niveau demande une option.'
      if (level?.necessite_option && value && !level.options?.some((option) => String(option.id_option) === value) && !(level.id_niveau === editing?.id_niveau && String(editing?.id_option) === value)) return 'Cette option n’est pas associée au niveau.'
      return undefined
    } },
    { name: 'salle', label: 'Salle habituelle', required: true, placeholder: 'Salle 101' },
    { name: 'montant_frais_annuel', label: 'Frais annuels (USD)', type: 'number', required: true, min: 0, step: 1 },
    { name: 'capacite', label: 'Capacité', type: 'number', min: 1, step: 1 },
    { name: 'actif', label: 'Statut', type: 'select', required: true, options: [{ value: 'oui', label: 'Active' }, { value: 'non', label: 'Inactive' }] },
  ]

  const startCreate = () => { setEditing(null); setFormOpen(true) }
  const startEdit = (klass: SchoolClassRecord) => { setEditing(klass); setFormOpen(true) }

  return (
    <>
      <PageHeader eyebrow="Organisation" title={admin ? 'Classes' : 'Mes classes'} description={admin ? 'Définissez les niveaux, options, salles et frais annuels. Les frais sont répartis sur deux semestres.' : 'Consultez uniquement les classes dans lesquelles vous enseignez.'} actions={admin && <Button onClick={startCreate} disabled={loading || Boolean(error)}><Plus />Nouvelle classe</Button>} />
      {loading && <p role="status" className="text-sm text-muted-foreground">Chargement des classes…</p>}
      {error && <div role="alert" className="rounded-xl border border-destructive/40 p-4 text-sm text-destructive">{error} <Button variant="outline" onClick={() => { void refresh().catch((cause: unknown) => setError(getApiErrorMessage(cause))) }}>Réessayer</Button></div>}
      {!loading && !error && years.every((year) => year.etat !== 'ouverte') && admin && <p className="rounded-xl border border-amber-500/40 p-4 text-sm">Ouvrez une année dans <Link className="underline" href="/annees-scolaires">Années, niveaux et options</Link> avant de créer une classe.</p>}
      <Toolbar search={search} onSearch={setSearch} placeholder="Classe, salle, niveau ou option…">
        <SimpleSelect ariaLabel="Filtrer par année" value={yearFilter} onValueChange={setYearFilter} options={[{ value: 'all', label: 'Toutes les années' }, ...years.map((year) => ({ value: String(year.id_annee), label: year.libelle }))]} />
      </Toolbar>
      {!loading && !error && rows.length === 0 && <p className="py-12 text-center text-sm text-muted-foreground">Aucune classe enregistrée pour cette recherche.</p>}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {rows.map((klass) => {
          const level = levelById.get(klass.id_niveau)
          const option = optionById.get(klass.id_option ?? -1)
          const annual = admin ? Number(klass.montant_frais_annuel) : 0
          const s1 = admin ? klass.frais_scolaires?.find((fee) => fee.semestre?.ordre === 1)?.montant_du ?? Math.floor(annual / 2) : 0
          const s2 = admin ? klass.frais_scolaires?.find((fee) => fee.semestre?.ordre === 2)?.montant_du ?? annual - Math.floor(annual / 2) : 0
          return <article key={klass.id_classe} className="rounded-2xl border bg-card p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3"><div><p className="text-xs uppercase text-muted-foreground">{yearById.get(klass.id_annee)?.libelle ?? 'Année inconnue'} · {level?.libelle ?? 'Niveau inconnu'}</p><h2 className="mt-1 font-serif text-2xl font-semibold">{klass.libelle}</h2>{option && <p className="text-sm text-gold">{option.libelle}</p>}</div><span className="rounded-full bg-muted px-2 py-1 text-xs">{klass.actif ? 'Active' : 'Inactive'}</span></div>
            <dl className="mt-5 space-y-2 text-sm"><div className="flex items-center gap-2"><DoorOpen className="size-4 text-muted-foreground" /><dt>Salle</dt><dd className="ml-auto font-medium">{klass.salle || 'À préciser'}</dd></div><div className="flex items-center gap-2"><Users className="size-4 text-muted-foreground" /><dt>Élèves inscrits</dt><dd className="ml-auto font-medium">{klass.inscriptions_count ?? 0}{klass.capacite ? ` / ${klass.capacite}` : ''}</dd></div>{admin && <div className="flex items-center gap-2"><BookOpen className="size-4 text-muted-foreground" /><dt>Frais annuels</dt><dd className="ml-auto font-medium">{formatMoney(annual, 'USD')}</dd></div>}</dl>
            {admin && <p className="mt-3 rounded-lg bg-muted/60 p-2 text-xs text-muted-foreground">S1 : {formatMoney(Number(s1), 'USD')} · S2 : {formatMoney(Number(s2), 'USD')}</p>}
            {admin && <div className="mt-4 flex justify-end gap-2 border-t pt-3"><Button variant="outline" size="sm" onClick={() => startEdit(klass)}><Pencil />Modifier</Button><Button variant="ghost" size="icon-sm" aria-label={`Supprimer ${klass.libelle}`} onClick={() => setDeleting(klass)}><Trash2 /></Button></div>}
          </article>
        })}
      </div>
      <EntityFormDialog open={formOpen} onOpenChange={setFormOpen} title={editing ? `Modifier ${editing.libelle}` : 'Nouvelle classe'} description="Le montant annuel sera réparti en deux échéances semestrielles." fields={fields} initial={{
        id_annee: String(editing?.id_annee ?? years.find((year) => year.etat === 'ouverte')?.id_annee ?? ''),
        id_niveau: String(editing?.id_niveau ?? ''), id_option: String(editing?.id_option ?? ''),
        libelle: editing?.libelle ?? '', modele_bulletin: editing?.modele_bulletin ?? 'examen_etat', salle: editing?.salle ?? '',
        montant_frais_annuel: String(editing?.montant_frais_annuel ?? 0),
        capacite: String(editing?.capacite ?? ''), actif: editing?.actif === false ? 'non' : 'oui',
      }} onSubmit={async (values) => {
        const payload = {
          id_annee: Number(values.id_annee), id_niveau: Number(values.id_niveau),
          id_option: levels.find((item) => String(item.id_niveau) === values.id_niveau)?.necessite_option && values.id_option ? Number(values.id_option) : null,
          libelle: values.libelle, modele_bulletin: values.modele_bulletin === 'standard' ? 'standard' as const : 'examen_etat' as const, salle: values.salle,
          montant_frais_annuel: Number(values.montant_frais_annuel),
          capacite: values.capacite ? Number(values.capacite) : null,
          actif: values.actif === 'oui',
        }
        if (editing) await updateSchoolClass(editing.id_classe, payload)
        else await createSchoolClass(payload)
        await refresh()
        toast.success(editing ? 'Classe mise à jour.' : 'Classe créée avec ses frais semestriels.')
      }} />
      <ConfirmDialog open={Boolean(deleting)} onOpenChange={(open) => { if (!open) setDeleting(null) }} description={`Supprimer la classe ${deleting?.libelle ?? ''} ? Une classe avec des inscriptions ou des cours affectés ne peut pas être supprimée.`} onConfirm={() => {
        if (!deleting) return
        const id = deleting.id_classe
        setDeleting(null)
        void deleteSchoolClass(id).then(refresh).then(() => toast.success('Classe supprimée.')).catch((cause: unknown) => toast.error(getApiErrorMessage(cause)))
      }} />
    </>
  )
}
