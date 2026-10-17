const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api/v1').replace(/\/$/, '')

export type UserRole = 'patient' | 'doctor' | 'admin' | 'receptionist' | 'nurse'

export type User = {
  id: string
  email: string
  role: UserRole
  is_active: boolean
}

type TokenResponse = {
  access_token: string
  token_type: string
}

export type DoctorRecord = {
  id: string
  full_name: string
  specialization: string
  department_id: string | null
  consultation_fee: string | null
}

export type DoctorSlot = {
  start_at: string
  duration_minutes: number
}

export type BedAvailabilityRecord = {
  ward_id: string
  ward: string
  ward_type: string
  total_beds: number
  available_beds: number
  occupied_beds: number
}

export type BloodAvailabilityRecord = {
  blood_group: string
  component: string
  units_available: number
}

export type AppointmentRecord = {
  id: string
  doctor_id: string
  patient_id: string
  start_at: string
  end_at: string
  status: string
}

export class ApiError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message)
    this.name = 'ApiError'
  }
}

async function request<T>(path: string, init: RequestInit = {}, token?: string): Promise<T> {
  const headers = new Headers(init.headers)
  if (init.body && !(init.body instanceof URLSearchParams) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  if (token) headers.set('Authorization', `Bearer ${token}`)

  let response: Response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers })
  } catch {
    throw new ApiError('Could not reach Medinex. Start the backend API and try again.')
  }

  if (!response.ok) {
    let message = `Request failed (${response.status}).`
    try {
      const body = await response.json() as { detail?: unknown }
      if (typeof body.detail === 'string') message = body.detail
      else if (Array.isArray(body.detail)) {
        const first = body.detail[0] as { msg?: unknown } | undefined
        if (typeof first?.msg === 'string') message = first.msg
      }
    } catch {
      // Use the status-based message when the API does not return JSON.
    }
    throw new ApiError(message, response.status)
  }

  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}

export async function signIn(email: string, password: string): Promise<TokenResponse> {
  const form = new URLSearchParams({ username: email, password })
  return request<TokenResponse>('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form,
  })
}

export function getCurrentUser(token: string): Promise<User> {
  return request<User>('/auth/me', {}, token)
}

export function listDoctors(): Promise<DoctorRecord[]> {
  return request<DoctorRecord[]>('/doctors')
}

export function getDoctorAvailability(doctorId: string, day: string): Promise<{ doctor_id: string; doctor_name: string; date: string; slots: DoctorSlot[] }> {
  const params = new URLSearchParams({ day })
  return request<{ doctor_id: string; doctor_name: string; date: string; slots: DoctorSlot[] }>(`/doctors/${encodeURIComponent(doctorId)}/availability?${params}`)
}

export function listBedAvailability(): Promise<BedAvailabilityRecord[]> {
  return request<BedAvailabilityRecord[]>('/resources/beds')
}

export function listBloodAvailability(): Promise<BloodAvailabilityRecord[]> {
  return request<BloodAvailabilityRecord[]>('/resources/blood')
}

export function bookAppointment(input: { doctor_id: string; start_at: string }, token: string): Promise<AppointmentRecord> {
  return request<AppointmentRecord>('/appointments', {
    method: 'POST',
    body: JSON.stringify(input),
  }, token)
}

export function listMyAppointments(token: string): Promise<AppointmentRecord[]> {
  return request<AppointmentRecord[]>('/appointments/mine', {}, token)
}

export async function registerPatient(input: { name: string; email: string; password: string }): Promise<void> {
  await request<User>('/auth/register/patient', {
    method: 'POST',
    body: JSON.stringify({ full_name: input.name, email: input.email, password: input.password }),
  })
}

export function askAssistant(message: string, token: string): Promise<{ reply: string }> {
  return request<{ reply: string }>('/assistant/chat', {
    method: 'POST',
    body: JSON.stringify({ message }),
  }, token)
}
