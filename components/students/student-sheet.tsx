'use client'

import { useMemo } from 'react'
import { Cake, Mail, MapPin, Phone, User } from 'lucide-react'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Avatar } from '@/components/app/person-cell'
import { StatusBadge } from '@/components/app/status-badge'
import { fmtGrade, SEMESTERS, SEMESTER_LABELS, studentSemesterAverages } from '@/lib/academics'
import { formatDate, formatMoney } from '@/lib/format'
import { useDB } from '@/lib/store'
import type { Student } from '@/lib/types'

export function StudentSheet({ student, onOpenChange }: { student: Student | null; onOpenChange: (open: boolean) => void }) {
  return (
    <Sheet open={Boolean(student)} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">{student && <StudentDetails student={student} />}</SheetContent>
    </Sheet>
  )
}

function StudentDetails({ student }: { student: Student }) {
  const data = useDB()!
  const klass = data.classes.find((c) => c.id === student.classId)

  const info = useMemo(() => {
    const averages = SEMESTERS.map((semester) => ({
      semester,
      avg: studentSemesterAverages(data, student.classId, semester).find((r) => r.student.id === student.id),
    }))
    const att = data.attendance.filter((a) => a.studentId === student.id)
    const payments = data.payments.filter((p) => p.studentId === student.id).sort((a, b) => b.date.localeCompare(a.date))
    const paid = payments.filter((p) => p.status === 'payé' && p.category === 'Scolarité').reduce((a, p) => a + p.amount, 0)
    const due = klass?.annualTuition ?? data.settings.tuitionByLevel[klass?.level ?? ''] ?? 0
    return {
      averages,
      absences: att.filter((a) => a.status === 'absent').length,
      lates: att.filter((a) => a.status === 'retard').length,
      rate: att.length ? (att.filter((a) => a.status === 'présent' || a.status === 'retard').length / att.length) * 100 : 100,
      payments,
      paid,
      due,
    }
  }, [data, student, klass])

  return (
    <>
      <SheetHeader className="border-b pb-5">
        <div className="flex items-center gap-4">
          <Avatar name={`${student.firstName} ${student.lastName} ${student.middleName ?? ''}`} className="size-14 text-base ring-2 ring-gold/40" />
          <div className="flex flex-col gap-1">
            <SheetTitle className="font-serif text-xl">
              {student.firstName} {student.lastName} {student.middleName}
            </SheetTitle>
            <SheetDescription>
              {student.matricule} · {klass?.name ?? 'Sans classe'}
            </SheetDescription>
            <StatusBadge status={student.status} className="w-fit" />
          </div>
        </div>
      </SheetHeader>
      <div className="flex flex-col gap-6 px-4 pb-6">
        <section className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl bg-muted/60 p-3">
            <p className="font-serif text-lg font-semibold">{info.rate.toFixed(0)} %</p>
            <p className="text-[11px] text-muted-foreground">Présence</p>
          </div>
          <div className="rounded-xl bg-muted/60 p-3">
            <p className="font-serif text-lg font-semibold">{info.absences}</p>
            <p className="text-[11px] text-muted-foreground">Absences</p>
          </div>
          <div className="rounded-xl bg-muted/60 p-3">
            <p className="font-serif text-lg font-semibold">{info.lates}</p>
            <p className="text-[11px] text-muted-foreground">Retards</p>
          </div>
        </section>

        <section>
          <h3 className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Informations</h3>
          <dl className="flex flex-col gap-2.5 text-sm">
            {[
              { icon: Cake, label: 'Naissance', value: formatDate(student.birthDate) },
              { icon: MapPin, label: 'Lieu de naissance', value: student.birthPlace || '—' },
              { icon: User, label: 'Parent', value: student.parentName },
              { icon: Phone, label: 'Téléphone', value: student.parentPhone },
              { icon: Mail, label: 'E-mail', value: student.email || '—' },
              { icon: MapPin, label: 'Adresse', value: student.address || '—' },
            ].map((row) => (
              <div key={row.label} className="flex items-center gap-3">
                <row.icon className="size-4 text-gold" aria-hidden="true" />
                <dt className="w-24 text-muted-foreground">{row.label}</dt>
                <dd className="flex-1 truncate font-medium">{row.value}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section>
          <h3 className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Résultats</h3>
          <div className="grid grid-cols-3 gap-2">
            {info.averages.map(({ semester, avg }) => (
              <div key={semester} className="rounded-xl border p-3">
                <p className="text-[11px] text-muted-foreground">{SEMESTER_LABELS[semester]}</p>
                <p className="mt-1 font-mono text-base font-semibold tabular-nums">{fmtGrade(avg?.general)}</p>
                {!avg?.complete && <p className="text-[11px] text-muted-foreground">Cotes incomplètes</p>}
                {avg?.rank && (
                  <p className="text-[11px] text-muted-foreground">
                    Rang {avg.rank}/{avg.classSize}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>

        <section>
          <div className="mb-2 flex items-end justify-between">
            <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Scolarité</h3>
            <span className="text-xs text-muted-foreground">
              {formatMoney(info.paid, data.settings.currency)} / {formatMoney(info.due, data.settings.currency)}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-gold transition-all duration-700" style={{ width: `${info.due ? Math.min(100, (info.paid / info.due) * 100) : 0}%` }} />
          </div>
          <ul className="mt-3 divide-y rounded-xl border">
            {info.payments.length === 0 && <li className="p-3 text-sm text-muted-foreground">Aucun paiement enregistré.</li>}
            {info.payments.slice(0, 6).map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-2 p-3 text-sm">
                <div className="flex flex-col">
                  <span className="font-medium">{p.category}</span>
                  <span className="text-xs text-muted-foreground">
                    {p.reference} · {formatDate(p.date)}
                  </span>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="font-semibold tabular-nums">{formatMoney(p.amount, data.settings.currency)}</span>
                  <StatusBadge status={p.status} />
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  )
}
