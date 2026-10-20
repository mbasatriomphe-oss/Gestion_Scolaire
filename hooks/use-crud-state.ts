'use client'

import { useState } from 'react'

export function useCrudState<T>() {
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<T | null>(null)
  const [deleting, setDeleting] = useState<T | null>(null)
  return {
    formOpen,
    setFormOpen,
    editing,
    deleting,
    setDeleting,
    openCreate: () => {
      setEditing(null)
      setFormOpen(true)
    },
    openEdit: (item: T) => {
      setEditing(item)
      setFormOpen(true)
    },
  }
}
