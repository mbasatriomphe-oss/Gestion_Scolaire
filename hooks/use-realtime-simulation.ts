'use client'

import { useEffect } from 'react'
import { toast } from 'sonner'
import { db } from '@/lib/store'
import type { AppNotification } from '@/lib/types'

const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)]

function randomEvent(): Omit<AppNotification, 'id' | 'createdAt' | 'read'> {
  const data = db.get()
  const s = pick(data.students)
  const name = `${s.firstName} ${s.lastName}`
  const klass = data.classes.find((c) => c.id === s.classId)?.name ?? ''
  const events: Array<Omit<AppNotification, 'id' | 'createdAt' | 'read'>> = [
    { type: 'paiement', title: 'Paiement en ligne reçu', message: `Mobile Money · ${name} (${klass}) a réglé ${pick([25000, 50000, 120000, 150000]).toLocaleString('fr-FR')} FCFA.` },
    { type: 'absence', title: 'Absence signalée', message: `${name} (${klass}) n'a pas été pointé(e) au premier cours.` },
    { type: 'inscription', title: 'Demande de réinscription', message: `Le parent de ${name} a soumis un dossier de réinscription.` },
    { type: 'note', title: 'Notes saisies', message: `De nouvelles notes ont été enregistrées en ${klass}.` },
    { type: 'systeme', title: 'Sauvegarde effectuée', message: 'La sauvegarde automatique des données locales est terminée.' },
  ]
  return pick(events)
}

export function useRealtimeSimulation(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return
    let timer: number
    const schedule = () => {
      timer = window.setTimeout(() => {
        const event = randomEvent()
        db.notify(event)
        toast(event.title, { description: event.message })
        schedule()
      }, 35000 + Math.random() * 40000)
    }
    schedule()
    return () => window.clearTimeout(timer)
  }, [enabled])
}
