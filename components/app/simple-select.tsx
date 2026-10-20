'use client'

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'

export interface Option {
  value: string
  label: string
}

interface SimpleSelectProps {
  value: string
  onValueChange: (value: string) => void
  options: Option[]
  placeholder?: string
  className?: string
  id?: string
  invalid?: boolean
  ariaLabel?: string
}

export function SimpleSelect({ value, onValueChange, options, placeholder = 'Sélectionner', className, id, invalid, ariaLabel }: SimpleSelectProps) {
  return (
    <Select items={options} value={value || null} onValueChange={(v) => onValueChange((v as string) ?? '')}>
      <SelectTrigger id={id} aria-label={ariaLabel} aria-invalid={invalid || undefined} className={cn('h-9 w-full bg-card', className)}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="max-h-72">
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
