'use client'

import { useCallback, useEffect, useState } from 'react'
import { CalendarDays, Layers3, Loader2, Pencil, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { EntityFormDialog, type FieldConfig } from '@/components/app/entity-form-dialog'
import { PageHeader } from '@/components/app/page-header'
import { getApiErrorMessage } from '@/lib/api'
import { formatDate } from '@/lib/format'
import { useCurrentUser } from '@/lib/store'
import {
  createSchoolCycle, createSchoolLevel, createSchoolOption, createSchoolYear,
  loadSchoolConfig, updateSchoolLevel, updateSchoolYear, type SchoolConfig, type SchoolLevel, type SchoolYear,
} from '@/lib/school-api'

const yearFields: FieldConfig[] = [
  { name: 'libelle', label: 'Année scolaire', required: true, placeholder: '2026-2027' },
  { name: 'date_debut', label: 'Début', type: 'date', required: true },
  { name: 'date_fin', label: 'Fin', type: 'date', required: true },
]

export default function SchoolYearsPage() {
  const user = useCurrentUser()
  const admin = user?.role === 'admin'
  const [config, setConfig] = useState<SchoolConfig | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [yearOpen, setYearOpen] = useState(false)
  const [cycleOpen, setCycleOpen] = useState(false)
  const [levelOpen, setLevelOpen] = useState(false)
  const [editingLevel, setEditingLevel] = useState<SchoolLevel | null>(null)
  const [optionOpen, setOptionOpen] = useState(false)
  const [optionLevel, setOptionLevel] = useState<SchoolLevel | null>(null)
  const [selectedOptionIds, setSelectedOptionIds] = useState<number[]>([])
  const [savingOptions, setSavingOptions] = useState(false)
  const [optionError, setOptionError] = useState('')
  const [busyYear, setBusyYear] = useState<number | null>(null)

  const refresh = useCallback(async () => {
    const next = await loadSchoolConfig()
    setConfig(next)
    setError('')
  }, [])

  useEffect(() => {
    void refresh().catch((cause: unknown) => setError(getApiErrorMessage(cause))).finally(() => setLoading(false))
  }, [refresh])

  const changeYearState = async (year: SchoolYear) => {
    setBusyYear(year.id_annee)
    try {
      await updateSchoolYear(year.id_annee, {
        libelle: year.libelle,
        date_debut: year.date_debut.slice(0, 10),
        date_fin: year.date_fin.slice(0, 10),
        etat: year.etat === 'ouverte' ? 'cloturee' : 'ouverte',
      })
      await refresh()
      toast.success(year.etat === 'ouverte' ? 'Année clôturée.' : 'Année ouverte.')
    } catch (cause) {
      toast.error(getApiErrorMessage(cause))
    } finally {
      setBusyYear(null)
    }
  }

  const openLevelForm = (level: SchoolLevel | null) => {
    setEditingLevel(level)
    setLevelOpen(true)
  }

  const openOptionLinks = (level: SchoolLevel) => {
    setOptionLevel(level)
    setSelectedOptionIds(level.options.map((option) => option.id_option))
    setOptionError('')
  }

  const saveOptionLinks = async () => {
    if (!optionLevel || savingOptions) return
    setSavingOptions(true)
    setOptionError('')
    try {
      await updateSchoolLevel(optionLevel.id_niveau, {
        id_cycle: optionLevel.id_cycle,
        libelle: optionLevel.libelle,
        ordre: optionLevel.ordre,
        necessite_option: optionLevel.necessite_option,
        option_ids: selectedOptionIds,
      })
      await refresh()
      setOptionLevel(null)
      toast.success('Options du niveau enregistrées.')
    } catch (cause) {
      setOptionError(getApiErrorMessage(cause))
    } finally {
      setSavingOptions(false)
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Organisation"
        title="Années, niveaux et options"
        description="Chaque année comprend deux semestres, chacun avec deux périodes et un examen."
        actions={admin && <Button onClick={() => setYearOpen(true)}><Plus />Nouvelle année</Button>}
      />
      {loading && <p role="status" className="text-sm text-muted-foreground">Chargement de la structure scolaire…</p>}
      {error && <div role="alert" className="rounded-lg border border-destructive/40 p-4 text-sm text-destructive">{error} <Button variant="outline" onClick={() => { void refresh().catch((cause: unknown) => setError(getApiErrorMessage(cause))) }}>Réessayer</Button></div>}

      <section className="space-y-4">
        <h2 className="flex items-center gap-2 font-serif text-xl font-semibold"><CalendarDays className="size-5" />Années scolaires</h2>
        {!loading && !error && config?.years.length === 0 && <p className="rounded-xl border p-5 text-sm text-muted-foreground">Créez une année scolaire pour commencer les inscriptions et ouvrir des classes.</p>}
        <div className="grid gap-4 lg:grid-cols-2">
          {config?.years.map((year) => (
            <article key={year.id_annee} className="rounded-2xl border bg-card p-5">
              <div className="flex items-start justify-between gap-3">
                <div><h3 className="font-serif text-xl font-semibold">{year.libelle}</h3><p className="text-sm text-muted-foreground">{formatDate(year.date_debut)} au {formatDate(year.date_fin)}</p></div>
                <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${year.etat === 'ouverte' ? 'bg-emerald-500/15 text-emerald-700' : 'bg-muted text-muted-foreground'}`}>{year.etat === 'ouverte' ? 'Ouverte' : 'Clôturée'}</span>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {year.semestres.filter((semester) => semester.ordre === 1 || semester.ordre === 2).map((semester) => (
                  <div key={semester.id_semestre} className="rounded-xl border p-3">
                    <p className="font-medium">{semester.libelle}</p>
                    <ul className="mt-2 space-y-1 text-xs text-muted-foreground">{semester.periodes.filter((period) => period.ordre >= 1 && period.ordre <= 3).map((period) => <li key={period.id_periode}>{period.libelle}</li>)}</ul>
                  </div>
                ))}
              </div>
              {(year.semestres.some((semester) => semester.ordre < 1 || semester.ordre > 2 || semester.periodes.some((period) => period.ordre < 1 || period.ordre > 3))) && <p className="mt-3 text-xs text-amber-700">Des évaluations historiques supplémentaires existent dans cette année ; elles restent conservées hors du parcours officiel.</p>}
              {admin && <Button variant="outline" size="sm" disabled={busyYear === year.id_annee} className="mt-4" onClick={() => { void changeYearState(year) }}>{year.etat === 'ouverte' ? 'Clôturer l’année' : 'Ouvrir cette année'}</Button>}
            </article>
          ))}
        </div>
      </section>

      <section className="mt-8 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 font-serif text-xl font-semibold"><Layers3 className="size-5" />Cycles et niveaux</h2>
          {admin && <div className="flex gap-2"><Button variant="outline" size="sm" onClick={() => setCycleOpen(true)}>Ajouter un cycle</Button><Button variant="outline" size="sm" onClick={() => openLevelForm(null)}>Ajouter un niveau</Button></div>}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {config?.cycles.map((cycle) => (
            <article key={cycle.id_cycle} className="rounded-xl border bg-card p-4">
              <h3 className="font-semibold">{cycle.libelle}</h3>
              <ul className="mt-3 space-y-3 text-sm">{config.levels.filter((level) => level.id_cycle === cycle.id_cycle).sort((a, b) => a.ordre - b.ordre).map((level) => (
                <li key={level.id_niveau} className="border-b pb-3 last:border-0">
                  <div className="flex flex-wrap items-center justify-between gap-2"><span className="font-medium">{level.ordre}. {level.libelle}</span><span className="text-xs text-muted-foreground">{level.necessite_option ? 'Avec option' : 'Sans option'}</span></div>
                  {level.necessite_option && <p className="mt-1 text-xs text-muted-foreground">{level.options.length > 0 ? `Options : ${level.options.map((option) => option.libelle).join(', ')}` : 'Aucune option associée : associez-en avant de créer une classe.'}</p>}
                  {admin && <div className="mt-2 flex flex-wrap gap-2"><Button variant="outline" size="xs" onClick={() => openLevelForm(level)}><Pencil />Modifier</Button>{level.necessite_option && <Button variant="outline" size="xs" onClick={() => openOptionLinks(level)}>Associer les options</Button>}</div>}
                </li>
              ))}</ul>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-8 space-y-4">
        <div className="flex items-center justify-between gap-3"><h2 className="font-serif text-xl font-semibold">Options disponibles</h2>{admin && <Button variant="outline" size="sm" onClick={() => setOptionOpen(true)}><Plus />Ajouter une option</Button>}</div>
        <p className="text-sm text-muted-foreground">Créez les options, puis associez-les aux niveaux concernés. Une option peut être utilisée par plusieurs niveaux.</p>
        <div className="flex flex-wrap gap-2">{config?.options.map((option) => <span key={option.id_option} className="rounded-full border bg-card px-3 py-1.5 text-sm">{option.libelle}</span>)}</div>
        {!config?.options.length && <p className="text-sm text-muted-foreground">Aucune option enregistrée.</p>}
      </section>

      <EntityFormDialog open={yearOpen} onOpenChange={setYearOpen} title="Nouvelle année scolaire" fields={yearFields} initial={{ libelle: '', date_debut: '', date_fin: '' }} onSubmit={async (values) => {
        if (values.date_fin <= values.date_debut) return 'La fin doit suivre le début de l’année.'
        await createSchoolYear({ libelle: values.libelle, date_debut: values.date_debut, date_fin: values.date_fin, etat: 'ouverte' })
        await refresh()
        toast.success('Année et évaluations créées.')
      }} />
      <EntityFormDialog open={cycleOpen} onOpenChange={setCycleOpen} title="Ajouter un cycle" fields={[{ name: 'libelle', label: 'Nom du cycle', required: true }]} initial={{ libelle: '' }} onSubmit={async (values) => { await createSchoolCycle(values.libelle); await refresh(); toast.success('Cycle créé.') }} />
      <EntityFormDialog open={levelOpen} onOpenChange={setLevelOpen} title={editingLevel ? `Modifier ${editingLevel.libelle}` : 'Ajouter un niveau'} description="Créez le niveau avec ou sans option ; vous pourrez ensuite lui associer plusieurs options." fields={[
        { name: 'id_cycle', label: 'Cycle', type: 'select', required: true, options: config?.cycles.filter((cycle) => cycle.id_cycle === editingLevel?.id_cycle || !cycle.libelle.toLowerCase().includes('orientation') || config.levels.filter((level) => level.id_cycle === cycle.id_cycle).length < 2).map((cycle) => ({ value: String(cycle.id_cycle), label: cycle.libelle })) ?? [] },
        { name: 'libelle', label: 'Nom du niveau', required: true, placeholder: '1re humanité' },
        { name: 'ordre', label: 'Ordre dans le cycle', type: 'number', min: 1, required: true },
        { name: 'necessite_option', label: 'Option', type: 'select', required: true, options: [{ value: 'non', label: 'Sans option' }, { value: 'oui', label: 'Option obligatoire' }] },
      ]} initial={{ id_cycle: String(editingLevel?.id_cycle ?? ''), libelle: editingLevel?.libelle ?? '', ordre: String(editingLevel?.ordre ?? ''), necessite_option: editingLevel?.necessite_option ? 'oui' : 'non' }} onSubmit={async (values) => {
        const needsOption = values.necessite_option === 'oui'
        const payload = { id_cycle: Number(values.id_cycle), libelle: values.libelle, ordre: Number(values.ordre), necessite_option: needsOption, option_ids: needsOption ? editingLevel?.options.map((option) => option.id_option) ?? [] : [] }
        if (editingLevel) await updateSchoolLevel(editingLevel.id_niveau, payload)
        else await createSchoolLevel(payload)
        await refresh()
        toast.success(editingLevel ? 'Niveau mis à jour.' : 'Niveau créé. Associez ses options si nécessaire.')
      }} />
      <EntityFormDialog open={optionOpen} onOpenChange={setOptionOpen} title="Ajouter une option" fields={[{ name: 'libelle', label: 'Nom de l’option', required: true, placeholder: 'Scientifique' }]} initial={{ libelle: '' }} onSubmit={async (values) => { await createSchoolOption(values.libelle); await refresh(); toast.success('Option créée.') }} />
      <Dialog open={Boolean(optionLevel)} onOpenChange={(open) => { if (!open && !savingOptions) setOptionLevel(null) }}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg">
          <form onSubmit={(event) => { event.preventDefault(); void saveOptionLinks() }} className="space-y-5">
            <DialogHeader>
              <DialogTitle>Options de {optionLevel?.libelle}</DialogTitle>
              <DialogDescription>Associez une ou plusieurs options à ce niveau. Une même option peut servir à plusieurs niveaux.</DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              {config?.options.filter((option) => option.actif || selectedOptionIds.includes(option.id_option)).map((option) => (
                <label key={option.id_option} className="flex cursor-pointer items-center gap-3 rounded-lg border p-3 text-sm">
                  <input type="checkbox" checked={selectedOptionIds.includes(option.id_option)} onChange={(event) => {
                    setSelectedOptionIds((current) => event.target.checked ? [...current, option.id_option] : current.filter((id) => id !== option.id_option))
                    setOptionError('')
                  }} className="size-4 accent-primary" />
                  <span>{option.libelle}</span>
                  {!option.actif && <span className="ml-auto text-xs text-muted-foreground">Inactive</span>}
                </label>
              ))}
              {!config?.options.length && <p className="rounded-lg border p-3 text-sm text-muted-foreground">Créez d’abord une option dans la section ci-dessus.</p>}
            </div>
            {optionError && <p role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{optionError}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOptionLevel(null)} disabled={savingOptions}>Annuler</Button>
              <Button type="submit" disabled={savingOptions}>{savingOptions && <Loader2 className="animate-spin" />}Enregistrer</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
