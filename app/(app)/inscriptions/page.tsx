'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Download, GraduationCap, Plus, School, UserCheck } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { DataTable, type Column } from '@/components/app/data-table'
import { PageHeader } from '@/components/app/page-header'
import { PersonCell } from '@/components/app/person-cell'
import { SimpleSelect } from '@/components/app/simple-select'
import { StatCard } from '@/components/app/stat-card'
import { matches, Toolbar } from '@/components/app/toolbar'
import { EntityFormDialog, type FieldConfig } from '@/components/app/entity-form-dialog'
import { getApiErrorMessage, request } from '@/lib/api'
import { downloadCSV, formatDate } from '@/lib/format'
import { loadStudentDirectory, type ApiEnrollment, type StudentDirectory } from '@/lib/students-api'
import { useCurrentUser } from '@/lib/store'

export default function EnrollmentsPage() {
  const user = useCurrentUser()
  const [formOpen,setFormOpen] = useState(false)
  const [studentFilter,setStudentFilter] = useState('all')
  const [directory, setDirectory] = useState<StudentDirectory | null>(null)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reload, setReload] = useState(0)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    loadStudentDirectory()
      .then((records) => { if (active) setDirectory(records) })
      .catch((reason: unknown) => { if (active) setError(getApiErrorMessage(reason)) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [reload])

  const students = useMemo(() => new Map(directory?.students.map((item) => [item.id_eleve, item]) ?? []), [directory])
  const classes = useMemo(() => new Map(directory?.classes.map((item) => [item.id_classe, item]) ?? []), [directory])
  const years = useMemo(() => new Map(directory?.years.map((item) => [item.id_annee, item]) ?? []), [directory])
  const enrollments = directory?.enrollments ?? []
  const rows = enrollments.filter((item) => {
    const student = students.get(item.id_eleve)
    return (studentFilter === 'all' || String(item.id_eleve) === studentFilter) && (status === 'all' || item.statut === status) && matches(
      search, student?.nom, student?.postnom, student?.prenom, student?.matricule,
      classes.get(item.id_classe)?.libelle, years.get(item.id_annee)?.libelle,
    )
  })
  const columns: Column<ApiEnrollment>[] = [
    { key: 'student', header: 'Élève', sortValue: (item) => students.get(item.id_eleve)?.nom ?? '', cell: (item) => {
      const student = students.get(item.id_eleve)
      return <PersonCell name={student ? `${student.prenom} ${student.nom} ${student.postnom}` : `Élève ${item.id_eleve}`} sub={student?.matricule ?? ''} />
    } },
    { key: 'class', header: 'Classe', sortValue: (item) => classes.get(item.id_classe)?.libelle ?? '', cell: (item) => classes.get(item.id_classe)?.libelle ?? '—' },
    { key: 'year', header: 'Année scolaire', sortValue: (item) => years.get(item.id_annee)?.libelle ?? '', cell: (item) => years.get(item.id_annee)?.libelle ?? '—' },
    { key: 'date', header: 'Inscrit le', sortValue: (item) => item.date_inscription, cell: (item) => formatDate(item.date_inscription) },
    { key: 'status', header: 'Statut', sortValue: (item) => item.statut, cell: (item) => item.statut === 'actif' ? 'Actif' : item.statut === 'abandon' ? 'Abandon' : 'Exclu' },
  ]

  return (
    <>
      <PageHeader eyebrow="Scolarité" title="Inscriptions" description="Élèves affectés aux classes et aux années scolaires, depuis la base de l’établissement." actions={
        <>
          <Button variant="outline" disabled={!rows.length} onClick={() => {
            downloadCSV('inscriptions.csv', rows.map((item) => {
              const student = students.get(item.id_eleve)
              return { Matricule: student?.matricule ?? '', Nom: student?.nom ?? '', Prénom: student?.prenom ?? '', Classe: classes.get(item.id_classe)?.libelle ?? '', Année: years.get(item.id_annee)?.libelle ?? '', Date: item.date_inscription.slice(0, 10), Statut: item.statut }
            }))
            toast.success(`${rows.length} inscription(s) exportée(s).`)
          }}><Download />Exporter</Button>
          {['admin','secretaire','comptable'].includes(user?.role ?? '') && <><Button variant="outline" nativeButton={false} render={<Link href="/eleves" />}>Nouvel élève</Button><Button onClick={()=>setFormOpen(true)} disabled={!directory}><Plus />Inscrire / Réinscrire</Button></>}
        </>
      } />
      {loading && <p role="status" className="text-sm text-muted-foreground">Chargement des inscriptions…</p>}
      {error && <div role="alert" className="flex items-center justify-between gap-3 rounded-lg border border-destructive/40 p-4 text-sm text-destructive"><span>{error}</span><Button variant="outline" onClick={() => setReload((value) => value + 1)}>Réessayer</Button></div>}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Inscriptions" value={String(enrollments.length)} icon={GraduationCap} />
        <StatCard label="Actives" value={String(enrollments.filter((item) => item.statut === 'actif').length)} icon={UserCheck} tone="success" delay={60} />
        <StatCard label="Classes concernées" value={String(new Set(enrollments.map((item) => item.id_classe)).size)} icon={School} tone="gold" delay={120} />
      </div>
      <section className="space-y-3 rounded-xl border bg-card p-4"><label className="text-sm font-medium">Parcours scolaire d’un élève</label><SimpleSelect ariaLabel="Élève à suivre" value={studentFilter} onValueChange={setStudentFilter} options={[{value:'all',label:'Tous les élèves'},...(directory?.students ?? []).map(s=>({value:String(s.id_eleve),label:s.matricule+' · '+s.nom+' '+s.postnom+' '+s.prenom}))]} />{studentFilter !== 'all' && <p className="text-sm">{new Set(enrollments.filter(e=>String(e.id_eleve)===studentFilter).map(e=>e.id_annee)).size} année(s) de scolarité dans l’établissement. Le matricule reste identique.</p>}</section>
      <EntityFormDialog open={formOpen} onOpenChange={setFormOpen} title="Inscrire / Réinscrire un élève" description="Sélectionnez le dossier existant. L’application vérifie les résultats annuels et le niveau autorisé avant de réinscrire l’élève." fields={[
       {name:'id_eleve',label:'Élève — matricule permanent',type:'select',required:true,options:(directory?.students ?? []).map(s=>({value:String(s.id_eleve),label:s.matricule+' · '+s.nom+' '+s.prenom}))},
       {name:'id_annee',label:'Année ouverte',type:'select',required:true,resetOnChange:['id_classe'],options:(directory?.years ?? []).filter(y=>y.etat==='ouverte').map(y=>({value:String(y.id_annee),label:y.libelle}))},
       {name:'id_classe',label:'Classe',type:'select',required:true,options:values=>(directory?.classes ?? []).filter(c=>c.actif && String(c.id_annee)===values.id_annee).map(c=>({value:String(c.id_classe),label:c.libelle}))},
       {name:'date_inscription',label:"Date d’inscription",type:'date',required:true}
      ] satisfies FieldConfig[]} initial={{id_eleve:studentFilter==='all'?'':studentFilter,id_annee:'',id_classe:'',date_inscription:new Date().toLocaleDateString('en-CA')}} onSubmit={async values=>{await request('/inscriptions',{method:'POST',body:JSON.stringify({...values,id_eleve:Number(values.id_eleve),id_annee:Number(values.id_annee),id_classe:Number(values.id_classe)})});setReload(v=>v+1);toast.success('Inscription enregistrée avec le matricule existant.')}} />
      <Toolbar search={search} onSearch={setSearch} placeholder="Élève, matricule, classe, année…">
        <SimpleSelect ariaLabel="Filtrer les inscriptions par statut" value={status} onValueChange={setStatus} options={[{ value: 'all', label: 'Tous les statuts' }, { value: 'actif', label: 'Actives' }, { value: 'abandon', label: 'Abandons' }, { value: 'exclu', label: 'Exclusions' }]} />
      </Toolbar>
      {!loading && !error && <DataTable rows={rows} columns={columns} getRowId={(item) => String(item.id_inscription)} />}
    </>
  )
}
