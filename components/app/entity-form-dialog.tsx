'use client'

import { useState, type FormEvent } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { getApiErrorMessage } from '@/lib/api'
import { cn } from '@/lib/utils'
import { SimpleSelect, type Option } from './simple-select'

export type FieldValues = Record<string, string>

export interface FieldConfig {
  name: string
  label: string
  type?: 'text' | 'email' | 'tel' | 'number' | 'date' | 'select' | 'multiselect' | 'textarea' | 'password' | 'color'
  options?: Option[] | ((values: FieldValues) => Option[])
  visible?: (values: FieldValues) => boolean
  resetOnChange?: string[]
  required?: boolean
  placeholder?: string
  min?: number
  max?: number
  step?: number
  full?: boolean
  validate?: (value: string, values: FieldValues) => string | undefined
}

interface EntityFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  fields: FieldConfig[]
  initial: FieldValues
  submitLabel?: string
  onSubmit: (values: FieldValues) => void | string | Promise<void | string>
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const PHONE_RE = /^\+?[0-9 ().-]{8,20}$/

function validateField(field: FieldConfig, value: string, values: FieldValues) {
  const v = value.trim()
  if (field.required && !v) return 'Ce champ est requis.'
  if (!v) return undefined
  if (field.type === 'email' && !EMAIL_RE.test(v)) return 'Adresse e-mail invalide.'
  if (field.type === 'tel' && !PHONE_RE.test(v)) return 'Numéro de téléphone invalide.'
  if (field.type === 'number') {
    const n = Number(v)
    if (Number.isNaN(n)) return 'Valeur numérique attendue.'
    if (field.min !== undefined && n < field.min) return `Minimum : ${field.min}.`
    if (field.max !== undefined && n > field.max) return `Maximum : ${field.max}.`
  }
  if ((field.type === 'text' || !field.type) && v.length > 120) return '120 caractères maximum.'
  return field.validate?.(v, values)
}

export function EntityFormDialog(props: EntityFormDialogProps) {
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        {props.open && <EntityForm {...props} />}
      </DialogContent>
    </Dialog>
  )
}

function EntityForm({ title, description, fields, initial, submitLabel = 'Enregistrer', onSubmit, onOpenChange }: EntityFormDialogProps) {
  const [values, setValues] = useState<FieldValues>(initial)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)

  const setValue = (name: string, value: string) => {
    const resets = fields.find((field) => field.name === name)?.resetOnChange ?? []
    setValues((current) => ({
      ...current,
      ...Object.fromEntries(resets.map((field) => [field, ''])),
      [name]: value,
    }))
    if (errors[name] || errors._form) setErrors((e) => ({ ...e, [name]: '', _form: '' }))
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (submitting) return
    const next: Record<string, string> = {}
    for (const f of fields) {
      if (f.visible && !f.visible(values)) continue
      const err = validateField(f, values[f.name] ?? '', values)
      if (err) next[f.name] = err
    }
    setErrors(next)
    if (Object.values(next).some(Boolean)) return
    setSubmitting(true)
    try {
      const trimmed = Object.fromEntries(Object.entries(values).map(([k, v]) => [k, typeof v === 'string' ? v.trim() : v]))
      const result = await onSubmit(trimmed)
      if (typeof result === 'string') {
        setErrors({ _form: result })
        return
      }
      onOpenChange(false)
    } catch (error) {
      setErrors({ _form: getApiErrorMessage(error) })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
      <DialogHeader>
        <DialogTitle className="font-serif text-xl">{title}</DialogTitle>
        {description && <DialogDescription>{description}</DialogDescription>}
      </DialogHeader>
      <div className="grid gap-4 sm:grid-cols-2">
        {fields.map((f) => {
          if (f.visible && !f.visible(values)) return null
          const id = `field-${f.name}`
          const error = errors[f.name]
          const errorId = `${id}-error`
          return (
            <div key={f.name} className={cn('flex flex-col gap-1.5', (f.full || f.type === 'textarea') && 'sm:col-span-2')}>
              <Label htmlFor={id} className="text-sm">
                {f.label}
                {f.required && <span className="text-gold">*</span>}
              </Label>
              {f.type === 'multiselect' ? (
                <div id={id} className="space-y-2 rounded-lg border p-3" role="group" aria-label={f.label}>
                  {(typeof f.options === 'function' ? f.options(values) : f.options ?? []).map(option => {
                    const selected = (values[f.name] || '').split(',').filter(Boolean)
                    return <label key={option.value} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={selected.includes(option.value)} onChange={event => setValue(f.name, (event.target.checked ? [...selected, option.value] : selected.filter(v => v !== option.value)).join(','))} />{option.label}</label>
                  })}
                </div>
              ) : f.type === 'select' ? (
                <SimpleSelect id={id} value={values[f.name] ?? ''} onValueChange={(v) => setValue(f.name, v)} options={typeof f.options === 'function' ? f.options(values) : f.options ?? []} placeholder={f.placeholder} invalid={Boolean(error)} />
              ) : f.type === 'textarea' ? (
                <Textarea id={id} value={values[f.name] ?? ''} onChange={(e) => setValue(f.name, e.target.value)} placeholder={f.placeholder} aria-invalid={Boolean(error) || undefined} aria-describedby={error ? errorId : undefined} />
              ) : (
                <Input
                  id={id}
                  type={f.type ?? 'text'}
                  value={values[f.name] ?? ''}
                  onChange={(e) => setValue(f.name, e.target.value)}
                  placeholder={f.placeholder}
                  min={f.min}
                  max={f.max}
                  step={f.step}
                  className={cn('h-9', f.type === 'color' && 'p-1')}
                  aria-invalid={Boolean(error) || undefined}
                  aria-describedby={error ? errorId : undefined}
                />
              )}
              {error && (
                <p id={errorId} className="text-xs font-medium text-destructive animate-in fade-in slide-in-from-top-1">
                  {error}
                </p>
              )}
            </div>
          )
        })}
      </div>
      {errors._form && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{errors._form}</p>}
      <DialogFooter>
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
          Annuler
        </Button>
        <Button type="submit" disabled={submitting} className="min-w-28">
          {submitting && <Loader2 className="animate-spin" />}
          {submitLabel}
        </Button>
      </DialogFooter>
    </form>
  )
}
