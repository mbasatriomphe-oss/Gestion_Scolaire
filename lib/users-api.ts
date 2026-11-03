import { request, type ApiUser } from './api'

interface Paginated<T> {
  data: T[]
  last_page: number
}

export async function listUsers(): Promise<ApiUser[]> {
  const users: ApiUser[] = []
  for (let page = 1; ; page += 1) {
    const response = await request<Paginated<ApiUser>>(`/utilisateurs?page=${page}`)
    users.push(...response.data)
    if (page >= response.last_page) return users
  }
}

export function createAccountant(values: { login: string; email: string; name: string; password: string; passwordConfirmation: string; role?: string }) {
  return request<ApiUser>('/utilisateurs', {
    method: 'POST',
    body: JSON.stringify({
      login: values.login,
      email: values.email,
      nom_complet: values.name,
      role: values.role ?? 'comptable',
      actif: true,
      mot_de_passe: values.password,
      mot_de_passe_confirmation: values.passwordConfirmation,
    }),
  })
}

export function setAccountActive(userId: number, actif: boolean) {
  return request<ApiUser>(`/utilisateurs/${userId}`, {
    method: 'PUT',
    body: JSON.stringify({ actif }),
  })
}
