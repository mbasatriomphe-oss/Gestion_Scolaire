'use client'

import { canEdit, type ModuleKey } from '@/lib/permissions'
import { useCurrentUser } from '@/lib/store'

export function useCanEdit(key: ModuleKey) {
  const user = useCurrentUser()
  return user ? canEdit(user.role, key) : false
}
