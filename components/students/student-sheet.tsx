'use client'

import Link from 'next/link'
import { Cake, FileText, Mail, MapPin, Phone, User, Wallet } from 'lucide-react'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Avatar } from '@/components/app/person-cell'
import { StatusBadge } from '@/components/app/status-badge'
import { formatDate } from '@/lib/format'
import { canAccess } from '@/lib/permissions'
import { useCurrentUser, useDB } from '@/lib/store'
import type { Student } from '@/lib/types'

export function StudentSheet({ student, onOpenChange }: { student: Student | null; onOpenChange: (open: boolean) => void }) {
  return (
    <Sheet open={Boolean(student)} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">{student && <StudentDetails student={student} />}</SheetContent>
    </Sheet>
  )
}

function StudentDetails({ student }: { student: Student }) {
  const data = useDB()
  const user = useCurrentUser()
  const klass = data?.classes.find((item) => item.id === student.classId)
  const rows = [
    { icon: Cake, label: 'Naissance', value: formatDate(student.birthDate) },
    { icon: MapPin, label: 'Lieu de naissance', value: student.birthPlace || '—' },
    { icon: User, label: 'Parent / tuteur', value: student.parentName || '—' },
    { icon: Phone, label: 'Téléphone', value: student.parentPhone || '—' },
    { icon: Mail, label: 'E-mail', value: student.email || '—' },
    { icon: MapPin, label: 'Adresse', value: student.address || '—' },
  ]

  return <>
    <SheetHeader className="border-b pb-5">
      <div className="flex items-center gap-4">
        <Avatar name={`${student.firstName} ${student.lastName} ${student.middleName ?? ''}`} className="size-14 text-base ring-2 ring-gold/40" />
        <div className="flex flex-col gap-1">
          <SheetTitle className="font-serif text-xl">{student.firstName} {student.lastName} {student.middleName}</SheetTitle>
          <SheetDescription>{student.matricule} · {klass?.name ?? 'Sans classe'}</SheetDescription>
          <StatusBadge status={student.status} className="w-fit" />
        </div>
      </div>
    </SheetHeader>
    <div className="flex flex-col gap-6 px-4 pb-6">
      <section>
        <h3 className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Informations</h3>
        <dl className="flex flex-col gap-2.5 text-sm">
          {rows.map((row) => <div key={row.label} className="flex items-center gap-3">
            <row.icon className="size-4 text-gold" aria-hidden="true" />
            <dt className="w-28 text-muted-foreground">{row.label}</dt>
            <dd className="flex-1 truncate font-medium">{row.value}</dd>
          </div>)}
        </dl>
      </section>
      <section className="grid gap-2">
        {user && student.classId && canAccess(user.role, 'bulletins') && <Link href={`/bulletins?eleve=${encodeURIComponent(student.id)}&classe=${encodeURIComponent(student.classId)}`} className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium hover:bg-muted">
          <FileText className="size-4" /> Imprimer le bulletin de cet élève
        </Link>}
        {user && canAccess(user.role, 'frais') && <Link href="/frais" className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium hover:bg-muted">
          <Wallet className="size-4" /> Consulter les frais et versements
        </Link>}
      </section>
    </div>
  </>
}
