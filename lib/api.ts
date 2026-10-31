import type { AppUser, Role } from './types'

const DEFAULT_API_URL = typeof window === 'undefined'
  ? 'http://127.0.0.1:8000/api'
  : `${window.location.protocol}//${window.location.hostname}:8000/api`
const API_URL = (process.env.NEXT_PUBLIC_API_URL || DEFAULT_API_URL).replace(/\/+$/, '')
const TOKEN_KEY = 'scolaris-api-token'

export interface ApiUser {
  id_user: number
  login: string
  email: string | null
  nom_complet: string
  role: string
  actif: boolean
  derniere_connexion: string | null
  id_enseignant?: number | null
}

interface LoginResponse {
  token: string
  utilisateur: ApiUser
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

function getToken() {
  return typeof window === 'undefined' ? null : window.localStorage.getItem(TOKEN_KEY)
}

export function clearAuthToken() {
  if (typeof window !== 'undefined') window.localStorage.removeItem(TOKEN_KEY)
}

export async function request<T>(
  path: string,
  options: RequestInit = {},
  authenticated = true,
): Promise<T> {
  const headers = new Headers(options.headers)
  headers.set('Accept', 'application/json')
  if (options.body) headers.set('Content-Type', 'application/json')

  const token = authenticated ? getToken() : null
  if (token) headers.set('Authorization', `Bearer ${token}`)

  const response = await fetch(`${API_URL}${path}`, { ...options, headers })
  const text = await response.text()
  let payload: unknown

  if (text) {
    try {
      payload = JSON.parse(text)
    } catch {
      if (response.ok) throw new Error('Le serveur a renvoyé une réponse illisible.')
    }
  }

  if (!response.ok) {
    const body = payload as { message?: unknown; errors?: Record<string, unknown> } | undefined
    const validationMessage = body?.errors
      ? Object.values(body.errors).flat().find((value): value is string => typeof value === 'string')
      : undefined
    const message = validationMessage
      ?? (typeof body?.message === 'string' ? body.message : `Erreur du serveur (${response.status}).`)
    throw new ApiError(message, response.status)
  }

  return payload as T
}

function isRole(role: string): role is Role {
  return ['admin', 'directeur', 'enseignant', 'comptable', 'secretaire'].includes(role)
}

export function toAppUser(user: ApiUser): AppUser {
  if (!isRole(user.role)) {
    throw new ApiError("Ce type de compte n'est pas pris en charge par cette interface.", 403)
  }

  return {
    id: String(user.id_user),
    name: user.nom_complet || user.login,
    email: user.email ?? user.login,
    password: '',
    role: user.role,
    status: user.actif ? 'actif' : 'inactif',
    lastLogin: user.derniere_connexion,
    ...(user.id_enseignant ? { teacherId: String(user.id_enseignant) } : {}),
  }
}

export async function login(identifier: string, password: string): Promise<AppUser> {
  const response = await request<LoginResponse>(
    '/auth/login',
    {
      method: 'POST',
      body: JSON.stringify({
        login: identifier.trim(),
        mot_de_passe: password,
        nom_appareil: 'Scolaris Web',
      }),
    },
    false,
  )

  window.localStorage.setItem(TOKEN_KEY, response.token)
  try {
    return toAppUser(response.utilisateur)
  } catch (error) {
    try {
      await logout()
    } catch (logoutError) {
      clearAuthToken()
      throw new Error(
        `${getApiErrorMessage(error)} Le jeton créé n'a pas pu être révoqué : ${getApiErrorMessage(logoutError)}`,
      )
    }
    clearAuthToken()
    throw error
  }
}

export async function getCurrentUser() {
  const user = await request<ApiUser>('/auth/me')
  return toAppUser(user)
}

export function hasAuthToken() {
  return getToken() !== null
}

export function logout() {
  return request<{ message: string }>('/auth/logout', { method: 'POST' })
}

export function getApiErrorMessage(error: unknown) {
  if (error instanceof ApiError) return error.message
  if (error instanceof TypeError) {
    return "Impossible de joindre l'API. Vérifiez que le backend est démarré et que son URL est correcte."
  }
  return error instanceof Error ? error.message : 'Une erreur inattendue est survenue.'
}
