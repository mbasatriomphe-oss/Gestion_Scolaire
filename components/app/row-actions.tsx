'use client'

import type { LucideIcon } from 'lucide-react'
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'

interface ExtraAction {
  label: string
  icon: LucideIcon
  onClick: () => void
}

export function RowActions({ onEdit, onDelete, extra = [] }: { onEdit?: () => void; onDelete?: () => void; extra?: ExtraAction[] }) {
  if (!onEdit && !onDelete && extra.length === 0) return null
  return (
    <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label="Actions" />}>
          <MoreHorizontal />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          {extra.map((a) => (
            <DropdownMenuItem key={a.label} onClick={a.onClick}>
              <a.icon />
              {a.label}
            </DropdownMenuItem>
          ))}
          {onEdit && (
            <DropdownMenuItem onClick={onEdit}>
              <Pencil />
              Modifier
            </DropdownMenuItem>
          )}
          {onDelete && (
            <>
              {(onEdit || extra.length > 0) && <DropdownMenuSeparator />}
              <DropdownMenuItem variant="destructive" onClick={onDelete}>
                <Trash2 />
                Supprimer
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
