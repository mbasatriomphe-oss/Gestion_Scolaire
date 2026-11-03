'use client'

import { useEffect, useMemo, useState } from 'react'
import { Clock3, Download, Plus, Receipt, Wallet } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { DataTable, type Column } from '@/components/app/data-table'
import { EntityFormDialog, type FieldConfig } from '@/components/app/entity-form-dialog'
import { PageHeader } from '@/components/app/page-header'
import { PersonCell } from '@/components/app/person-cell'
import { SimpleSelect } from '@/components/app/simple-select'
import { StatCard } from '@/components/app/stat-card'
import { matches, Toolbar } from '@/components/app/toolbar'
import { useCanEdit } from '@/hooks/use-permission'
import { getApiErrorMessage } from '@/lib/api'
import {
  createFinancePayment, loadFinanceDirectory,
  type FinanceDirectory, type FinanceEnrollment, type FinanceFee, type FinancePayment,
} from '@/lib/finance-api'
import { downloadCSV, formatDate, formatMoney, todayISO } from '@/lib/format'
import { useCurrentUser } from '@/lib/store'

interface StudentBalance {
  enrollment: FinanceEnrollment
  fee: FinanceFee
  paid: number
  remaining: number
  semesterOrder: number
}

const methods: Array<{ value: FinancePayment['mode_paiement']; label: string }> = [
  { value: 'espece', label: 'Espèces' },
  { value: 'cheque', label: 'Chèque' },
  { value: 'virement', label: 'Virement' },
  { value: 'autre', label: 'Autre' },
]

export default function FeesPage() {
  const user = useCurrentUser()
  const editable = useCanEdit('frais') && (user?.role === 'admin' || user?.role === 'comptable')
  const [directory, setDirectory] = useState<FinanceDirectory | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [reload, setReload] = useState(0)
  const [yearId, setYearId] = useState('')
  const [semesterId, setSemesterId] = useState('all')
  const [search, setSearch] = useState('')
  const [formOpen, setFormOpen] = useState(false)

  useEffect(() => {
    let active = true
    loadFinanceDirectory()
      .then((loaded) => {
        if (!active) return
        setDirectory(loaded)
        setYearId((current) => current || String(loaded.years.filter((year) => year.etat === 'ouverte').at(-1)?.id_annee ?? loaded.years.at(-1)?.id_annee ?? ''))
        setLoadError('')
      })
      .catch((error: unknown) => { if (active) setLoadError(getApiErrorMessage(error)) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [reload])

  const students = useMemo(() => new Map(directory?.students.map((student) => [student.id_eleve, student]) ?? []), [directory])
  const classes = useMemo(() => new Map(directory?.classes.map((klass) => [klass.id_classe, klass]) ?? []), [directory])
  const semesters = useMemo(() => directory?.semesters.filter((semester) => String(semester.id_annee) === yearId).sort((a, b) => a.ordre - b.ordre) ?? [], [directory, yearId])
  const semesterById = useMemo(() => new Map(directory?.semesters.map((semester) => [semester.id_semestre, semester]) ?? []), [directory])
  const enrollments = useMemo(() => directory?.enrollments.filter((enrollment) => String(enrollment.id_annee) === yearId) ?? [], [directory, yearId])
  const enrollmentById = useMemo(() => new Map(directory?.enrollments.map((enrollment) => [enrollment.id_inscription, enrollment]) ?? []), [directory])
  const feeByClassSemester = useMemo(() => new Map(directory?.fees.map((fee) => [`${fee.id_classe}|${fee.id_semestre}`, fee]) ?? []), [directory])
  const feeById = useMemo(() => new Map(directory?.fees.map((fee) => [fee.id_frais, fee]) ?? []), [directory])
  const paidByEnrollmentFee = useMemo(() => {
    const sums = new Map<string, number>()
    for (const payment of directory?.payments ?? []) {
      const key = `${payment.id_inscription}|${payment.id_frais}`
      sums.set(key, (sums.get(key) ?? 0) + payment.montant)
    }
    return sums
  }, [directory])

  const balances = useMemo(() => {
    const rows: StudentBalance[] = []
    for (const enrollment of enrollments) {
      for (const semester of semesters) {
        if (semesterId !== 'all' && semesterId !== String(semester.id_semestre)) continue
        const fee = feeByClassSemester.get(`${enrollment.id_classe}|${semester.id_semestre}`)
        if (!fee) continue
        const paid = paidByEnrollmentFee.get(`${enrollment.id_inscription}|${fee.id_frais}`) ?? 0
        rows.push({ enrollment, fee, paid, remaining: Math.max(0, fee.montant_du - paid), semesterOrder: semester.ordre })
      }
    }
    return rows
  }, [enrollments, semesters, semesterId, feeByClassSemester, paidByEnrollmentFee])

  const payments = (directory?.payments ?? []).filter((payment) => {
    const enrollment = enrollmentById.get(payment.id_inscription)
    const fee = feeById.get(payment.id_frais)
    const student = students.get(enrollment?.id_eleve ?? -1)
    const klass = classes.get(enrollment?.id_classe ?? -1)
    return String(enrollment?.id_annee) === yearId &&
      (semesterId === 'all' || String(fee?.id_semestre) === semesterId) &&
      matches(search, payment.reference_recu, student?.nom, student?.postnom, student?.prenom, student?.matricule, klass?.libelle)
  })

  const due = balances.reduce((total, balance) => total + balance.fee.montant_du, 0)
  const received = balances.reduce((total, balance) => total + balance.paid, 0)
  const remaining = balances.reduce((total, balance) => total + balance.remaining, 0)
  const enrollmentOptions = enrollments
    .filter((enrollment) => enrollment.statut === 'actif')
    .map((enrollment) => {
      const student = students.get(enrollment.id_eleve)
      const klass = classes.get(enrollment.id_classe)
      return { value: String(enrollment.id_inscription), label: `${student?.prenom ?? 'Élève'} ${student?.nom ?? ''} · ${klass?.libelle ?? 'Classe'}` }
    })

  const fields: FieldConfig[] = [
    { name: 'id_inscription', label: 'Élève et classe', type: 'select', options: enrollmentOptions, required: true },
    { name: 'id_semestre', label: 'Semestre', type: 'select', options: semesters.map((semester) => ({ value: String(semester.id_semestre), label: semester.libelle })), required: true },
    {
      name: 'montant', label: 'Tranche versée (USD)', type: 'number', required: true, min: 1, step: 1,
      validate: (raw, values) => {
        if (!Number.isInteger(Number(raw))) return 'Saisissez un montant entier en dollars US.'
        const enrollment = enrollmentById.get(Number(values.id_inscription))
        const fee = feeByClassSemester.get(`${enrollment?.id_classe}|${values.id_semestre}`)
        if (!fee) return 'Les frais de ce semestre ne sont pas définis pour cette classe.'
        const paid = paidByEnrollmentFee.get(`${enrollment?.id_inscription}|${fee.id_frais}`) ?? 0
        if (Number(raw) > fee.montant_du - paid) return `Solde restant : ${formatMoney(Math.max(0, fee.montant_du - paid), 'USD')}.`
        return undefined
      },
    },
    { name: 'date_paiement', label: 'Date du versement', type: 'date', required: true },
    { name: 'mode_paiement', label: 'Mode de paiement', type: 'select', options: methods, required: true },
    { name: 'observation', label: 'Observation', type: 'textarea', full: true },
  ]

  const columns: Column<FinancePayment>[] = [
    { key: 'reference', header: 'Reçu', sortValue: (payment) => payment.reference_recu, cell: (payment) => <span className="font-mono text-xs">{payment.reference_recu}</span> },
    {
      key: 'student', header: 'Élève', sortValue: (payment) => students.get(enrollmentById.get(payment.id_inscription)?.id_eleve ?? -1)?.nom ?? '',
      cell: (payment) => {
        const student = students.get(enrollmentById.get(payment.id_inscription)?.id_eleve ?? -1)
        return <PersonCell name={student ? `${student.prenom} ${student.nom} ${student.postnom}` : 'Élève'} sub={student?.matricule ?? ''} />
      },
    },
    { key: 'class', header: 'Classe', cell: (payment) => classes.get(enrollmentById.get(payment.id_inscription)?.id_classe ?? -1)?.libelle ?? '—' },
    { key: 'semester', header: 'Semestre', cell: (payment) => semesterById.get(feeById.get(payment.id_frais)?.id_semestre ?? -1)?.libelle ?? '—' },
    { key: 'date', header: 'Date', sortValue: (payment) => payment.date_paiement, cell: (payment) => formatDate(payment.date_paiement) },
    { key: 'amount', header: 'Tranche', sortValue: (payment) => payment.montant, cell: (payment) => <span className="font-semibold tabular-nums">{formatMoney(payment.montant, 'USD')}</span> },
    { key: 'method', header: 'Mode', cell: (payment) => methods.find((method) => method.value === payment.mode_paiement)?.label ?? payment.mode_paiement },
  ]

  const balanceColumns: Column<StudentBalance>[] = [
    {
      key: 'student', header: 'Élève', sortValue: (row) => students.get(row.enrollment.id_eleve)?.nom ?? '',
      cell: (row) => {
        const student = students.get(row.enrollment.id_eleve)
        return <PersonCell name={student ? `${student.prenom} ${student.nom} ${student.postnom}` : 'Élève'} sub={student?.matricule ?? ''} />
      },
    },
    { key: 'class', header: 'Classe', cell: (row) => classes.get(row.enrollment.id_classe)?.libelle ?? '—' },
    { key: 'semester', header: 'Semestre', sortValue: (row) => row.semesterOrder, cell: (row) => `S${row.semesterOrder}` },
    { key: 'due', header: 'Dû', sortValue: (row) => row.fee.montant_du, cell: (row) => formatMoney(row.fee.montant_du, 'USD') },
    { key: 'paid', header: 'Versé', sortValue: (row) => row.paid, cell: (row) => formatMoney(row.paid, 'USD') },
    { key: 'remaining', header: 'Reste', sortValue: (row) => row.remaining, cell: (row) => <strong className={row.remaining > 0 ? 'text-amber-600' : 'text-success'}>{formatMoney(row.remaining, 'USD')}</strong> },
  ]

  return (
    <>
      <PageHeader
        eyebrow="Comptabilité"
        title="Frais scolaires"
        description="Suivez le montant dû par semestre et enregistrez chaque tranche versée par un élève."
        actions={<>
          <Button variant="outline" onClick={() => downloadCSV('paiements-scolaires.csv', payments.map((payment) => ({
            Reçu: payment.reference_recu, Élève: students.get(enrollmentById.get(payment.id_inscription)?.id_eleve ?? -1)?.matricule ?? '',
            Classe: classes.get(enrollmentById.get(payment.id_inscription)?.id_classe ?? -1)?.libelle ?? '',
            Semestre: semesterById.get(feeById.get(payment.id_frais)?.id_semestre ?? -1)?.libelle ?? '',
            Date: payment.date_paiement, Montant_USD: payment.montant,
          })))}><Download />Exporter</Button>
          {editable && <Button onClick={() => setFormOpen(true)} disabled={loading || Boolean(loadError) || !balances.some((row) => row.remaining > 0)}><Plus />Enregistrer une tranche</Button>}
        </>}
      />

      {loading && <p role="status" className="text-sm text-muted-foreground">Chargement des frais scolaires…</p>}
      {loadError && <div role="alert" className="flex items-center justify-between gap-3 rounded-lg border border-destructive/40 p-3 text-sm text-destructive"><span>{loadError}</span><Button variant="outline" onClick={() => { setLoading(true); setReload((value) => value + 1) }}>Réessayer</Button></div>}
      {!loading && !loadError && directory?.years.length === 0 && <p className="rounded-lg border p-3 text-sm">Créez d’abord une année scolaire et des classes pour définir les frais semestriels.</p>}

      <div className="grid gap-3 rounded-2xl border bg-card p-4 sm:grid-cols-2">
        <div><label htmlFor="fees-year" className="mb-1.5 block text-xs font-medium">Année scolaire</label><SimpleSelect id="fees-year" value={yearId} onValueChange={(value) => { setYearId(value); setSemesterId('all') }} options={directory?.years.map((year) => ({ value: String(year.id_annee), label: year.libelle })) ?? []} /></div>
        <div><label htmlFor="fees-semester" className="mb-1.5 block text-xs font-medium">Semestre suivi</label><SimpleSelect id="fees-semester" value={semesterId} onValueChange={setSemesterId} options={[{ value: 'all', label: 'Deux semestres' }, ...semesters.map((semester) => ({ value: String(semester.id_semestre), label: semester.libelle }))]} /></div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Montant dû" value={formatMoney(due, 'USD')} icon={Receipt} />
        <StatCard label="Encaissé" value={formatMoney(received, 'USD')} icon={Wallet} tone="success" delay={60} />
        <StatCard label="Reste à payer" value={formatMoney(remaining, 'USD')} icon={Clock3} tone="gold" delay={120} />
      </div>

      <section className="space-y-3">
        <h2 className="font-serif text-xl font-semibold">Soldes par élève</h2>
        <DataTable rows={balances} columns={balanceColumns} getRowId={(row) => `${row.enrollment.id_inscription}-${row.fee.id_frais}`} emptyMessage="Aucun frais semestriel n’est défini pour les inscriptions de cette année." pageSize={15} />
      </section>

      <section className="space-y-3">
        <h2 className="font-serif text-xl font-semibold">Versements enregistrés</h2>
        <Toolbar search={search} onSearch={setSearch} placeholder="Reçu, élève, matricule…" />
        <DataTable rows={payments} columns={columns} getRowId={(payment) => String(payment.id_paiement)} pageSize={15} />
      </section>

      {editable && <EntityFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        title="Enregistrer une tranche"
        description="Le montant est ajouté au total déjà payé pour le semestre choisi. Le reçu est généré automatiquement."
        fields={fields}
        initial={{ id_inscription: '', id_semestre: semesterId !== 'all' ? semesterId : semesters[0] ? String(semesters[0].id_semestre) : '', montant: '', date_paiement: todayISO(), mode_paiement: 'espece', observation: '' }}
        onSubmit={async (values) => {
          const enrollment = enrollmentById.get(Number(values.id_inscription))
          const fee = feeByClassSemester.get(`${enrollment?.id_classe}|${values.id_semestre}`)
          if (!enrollment || !fee) return 'Choisissez une inscription et un semestre avec frais définis.'
          const created = await createFinancePayment({
            id_inscription: enrollment.id_inscription,
            id_frais: fee.id_frais,
            montant: Number(values.montant),
            date_paiement: values.date_paiement,
            mode_paiement: values.mode_paiement as FinancePayment['mode_paiement'],
            observation: values.observation || null,
          })
          setDirectory((current) => current ? { ...current, payments: [created, ...current.payments] } : current)
          toast.success(`Tranche enregistrée. Reçu ${created.reference_recu}.`)
        }}
      />}
    </>
  )
}
