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

export type DepartmentRecord = {
  id: string
  name: string
  location: string | null
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

export type DoctorScheduleInput = {
  weekday: number
  start_time: string
  end_time: string
  slot_minutes: number
}

export type BedStatus = 'available' | 'reserved' | 'occupied' | 'cleaning' | 'maintenance'
export type BloodComponent = 'red_cells' | 'platelets' | 'plasma' | 'whole_blood'

export type PaginatedResponse<T> = { items: T[]; total: number; limit: number; offset: number }

export type PatientDirectoryRecord = {
  id: string
  full_name: string
  email: string
  phone: string | null
  created_at: string
  appointment_count: number
  latest_appointment_at: string | null
}

export type BloodRequestRecord = {
  id: string
  patient_id: string | null
  patient_name: string | null
  requested_by_id: string | null
  requester_email: string | null
  blood_group: string
  component: BloodComponent
  units: number
  urgency: 'routine' | 'urgent' | 'emergency'
  reason: string | null
  status: 'pending' | 'approved' | 'rejected' | 'fulfilled'
  created_at: string
  updated_at: string
}

export type AuditLogRecord = {
  id: string
  actor_email: string | null
  actor_role: UserRole | null
  action: string
  resource_type: string
  resource_id: string | null
  created_at: string
}

export type NotificationRecord = {
  id: string
  category: string
  title: string
  message: string
  resource_type: string | null
  resource_id: string | null
  is_read: boolean
  created_at: string
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

export function listDepartments(): Promise<DepartmentRecord[]> {
  return request<DepartmentRecord[]>('/departments')
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

export function cancelAppointment(appointmentId: string, token: string): Promise<AppointmentRecord> {
  return request<AppointmentRecord>(`/appointments/${encodeURIComponent(appointmentId)}/cancel`, { method: 'POST' }, token)
}

export function completeAppointment(appointmentId: string, token: string): Promise<AppointmentRecord> {
  return request<AppointmentRecord>(`/appointments/${encodeURIComponent(appointmentId)}/complete`, { method: 'POST' }, token)
}

export function createDepartment(input: { name: string; location?: string }, token: string): Promise<DepartmentRecord> {
  return request<DepartmentRecord>('/admin/departments', { method: 'POST', body: JSON.stringify(input) }, token)
}

export function createDoctor(input: { email: string; password: string; full_name: string; specialization: string; department_id?: string; consultation_fee?: number }, token: string): Promise<DoctorRecord> {
  return request<DoctorRecord>('/admin/doctors', { method: 'POST', body: JSON.stringify(input) }, token)
}

export function createDoctorSchedule(doctorId: string, input: DoctorScheduleInput, token: string): Promise<{ id: string; doctor_id: string; weekday: number; start_time: string; end_time: string; slot_minutes: number }> {
  return request<{ id: string; doctor_id: string; weekday: number; start_time: string; end_time: string; slot_minutes: number }>(`/admin/doctors/${encodeURIComponent(doctorId)}/schedules`, { method: 'POST', body: JSON.stringify(input) }, token)
}

export function createWard(input: { name: string; ward_type: string }, token: string): Promise<{ id: string; name: string; ward_type: string }> {
  return request<{ id: string; name: string; ward_type: string }>('/admin/wards', { method: 'POST', body: JSON.stringify(input) }, token)
}

export function createBed(wardId: string, input: { bed_number: string; status: BedStatus }, token: string): Promise<{ id: string; ward_id: string; bed_number: string; status: BedStatus }> {
  return request<{ id: string; ward_id: string; bed_number: string; status: BedStatus }>(`/admin/wards/${encodeURIComponent(wardId)}/beds`, { method: 'POST', body: JSON.stringify(input) }, token)
}

export function addBloodInventory(input: { blood_group: string; component: BloodComponent; units: number; expires_on: string; tested: boolean }, token: string): Promise<{ id: string; blood_group: string; component: string; units: number; expires_on: string; tested: boolean }> {
  return request<{ id: string; blood_group: string; component: string; units: number; expires_on: string; tested: boolean }>('/admin/blood-inventory', { method: 'POST', body: JSON.stringify(input) }, token)
}

export function listAdminPatients(search: string, token: string): Promise<PaginatedResponse<PatientDirectoryRecord>> {
  const params = new URLSearchParams({ search, limit: '100' })
  return request<PaginatedResponse<PatientDirectoryRecord>>(`/admin/patients?${params}`, {}, token)
}

export function listBloodRequests(token: string, requestStatus?: string): Promise<PaginatedResponse<BloodRequestRecord>> {
  const params = new URLSearchParams({ limit: '100' })
  if (requestStatus && requestStatus !== 'all') params.set('request_status', requestStatus)
  return request<PaginatedResponse<BloodRequestRecord>>(`/admin/blood-requests?${params}`, {}, token)
}

export function createBloodRequest(input: { patient_id?: string; blood_group: string; component: BloodComponent; units: number; urgency: BloodRequestRecord['urgency']; reason?: string }, token: string): Promise<BloodRequestRecord> {
  return request<BloodRequestRecord>('/admin/blood-requests', { method: 'POST', body: JSON.stringify(input) }, token)
}

export function updateBloodRequest(requestId: string, requestStatus: BloodRequestRecord['status'], token: string): Promise<BloodRequestRecord> {
  return request<BloodRequestRecord>(`/admin/blood-requests/${encodeURIComponent(requestId)}`, { method: 'PATCH', body: JSON.stringify({ status: requestStatus }) }, token)
}

export function listAuditLogs(token: string): Promise<PaginatedResponse<AuditLogRecord>> {
  return request<PaginatedResponse<AuditLogRecord>>('/admin/audit-logs?limit=100', {}, token)
}

export function listNotifications(token: string): Promise<NotificationRecord[]> {
  return request<NotificationRecord[]>('/notifications/mine?limit=100', {}, token)
}

export function markNotificationRead(notificationId: string, token: string): Promise<NotificationRecord> {
  return request<NotificationRecord>(`/notifications/${encodeURIComponent(notificationId)}/read`, { method: 'PATCH' }, token)
}

export function markAllNotificationsRead(token: string): Promise<void> {
  return request<void>('/notifications/read-all', { method: 'POST' }, token)
}

export async function registerPatient(input: { name: string; email: string; password: string }): Promise<void> {
  await request<User>('/auth/register/patient', {
    method: 'POST',
    body: JSON.stringify({ full_name: input.name, email: input.email, password: input.password }),
  })
}

export type AssistantAction = {
  type: string
  [key: string]: any
}

export type AssistantResponse = {
  reply: string
  action?: AssistantAction | null
}

export function askAssistant(message: string, token: string): Promise<AssistantResponse> {
  return request<AssistantResponse>('/assistant/chat', {
    method: 'POST',
    body: JSON.stringify({ message }),
  }, token)
}
