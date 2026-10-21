import {
  Activity, BedDouble, Bell, BriefcaseMedical, CalendarDays, ChartNoAxesCombined,
  ClipboardList, Droplets, FileClock, HeartPulse, LayoutDashboard, Settings,
  Stethoscope, Users, UserRound, type LucideIcon,
} from 'lucide-react'

export type PortalRole = 'patient' | 'doctor' | 'admin'
export type NavItem = { label: string; path: string; icon: LucideIcon; group?: string }

export const roleLabels: Record<PortalRole, string> = {
  patient: 'Patient workspace', doctor: 'Care team workspace', admin: 'Hospital operations',
}

export const portalNavigation: Record<PortalRole, NavItem[]> = {
  patient: [
    { label: 'Overview', path: '/patient/dashboard', icon: LayoutDashboard },
    { label: 'Find a doctor', path: '/patient/doctors', icon: Stethoscope, group: 'YOUR CARE' },
    { label: 'Appointments', path: '/patient/appointments', icon: CalendarDays },
    { label: 'Blood availability', path: '/patient/blood-availability', icon: Droplets },
    { label: 'Bed availability', path: '/patient/bed-availability', icon: BedDouble },
    { label: 'AI assistant', path: '/patient/ai-assistant', icon: Activity },
    { label: 'Notifications', path: '/patient/notifications', icon: Bell },
    { label: 'My profile', path: '/patient/profile', icon: UserRound, group: 'ACCOUNT' },
  ],
  doctor: [
    { label: 'Overview', path: '/doctor/dashboard', icon: LayoutDashboard },
    { label: 'My schedule', path: '/doctor/schedule', icon: CalendarDays, group: 'CARE TEAM' },
    { label: 'Appointments', path: '/doctor/appointments', icon: ClipboardList },
    { label: 'Patients', path: '/doctor/patients', icon: Users },
    { label: 'My profile', path: '/doctor/profile', icon: UserRound, group: 'ACCOUNT' },
  ],
  admin: [
    { label: 'Overview', path: '/admin/dashboard', icon: LayoutDashboard },
    { label: 'Doctors', path: '/admin/doctors', icon: Stethoscope, group: 'DIRECTORY' },
    { label: 'Patients', path: '/admin/patients', icon: Users },
    { label: 'Departments', path: '/admin/departments', icon: BriefcaseMedical },
    { label: 'Appointments', path: '/admin/appointments', icon: CalendarDays, group: 'OPERATIONS' },
    { label: 'Wards & beds', path: '/admin/wards', icon: BedDouble },
    { label: 'Blood bank', path: '/admin/blood-bank', icon: Droplets },
    { label: 'Blood requests', path: '/admin/blood-requests', icon: HeartPulse },
    { label: 'Staff', path: '/admin/staff', icon: UserRound, group: 'INSIGHTS' },
    { label: 'Reports', path: '/admin/reports', icon: ChartNoAxesCombined },
    { label: 'Audit log', path: '/admin/audit-logs', icon: FileClock },
    { label: 'Settings', path: '/admin/settings', icon: Settings },
  ],
}

export const demoDoctors = [
  { name: 'Dr. Priya Nair', specialty: 'Cardiology', initials: 'PN', tone: 'mint', rating: '4.9', experience: '12 years', availability: 'Today, 3:30 PM', location: 'Heart & Vascular' },
  { name: 'Dr. Arjun Mehta', specialty: 'Neurology', initials: 'AM', tone: 'lavender', rating: '4.8', experience: '9 years', availability: 'Tomorrow, 10:00 AM', location: 'Neurosciences' },
  { name: 'Dr. Sana Iqbal', specialty: 'Pediatrics', initials: 'SI', tone: 'peach', rating: '5.0', experience: '15 years', availability: 'Today, 4:15 PM', location: 'Children’s Health' },
  { name: 'Dr. Rohan Desai', specialty: 'Orthopedics', initials: 'RD', tone: 'blue', rating: '4.7', experience: '11 years', availability: 'Thu, 9:30 AM', location: 'Bone & Joint' },
  { name: 'Dr. Leena Shah', specialty: 'Dermatology', initials: 'LS', tone: 'rose', rating: '4.9', experience: '8 years', availability: 'Fri, 11:00 AM', location: 'Skin & Wellness' },
]

export const demoAppointments = [
  { patient: 'Aarav Kulkarni', doctor: 'Dr. Priya Nair', specialty: 'Cardiology', date: 'Today, 10:30 AM', status: 'Confirmed', code: 'APT-2041' },
  { patient: 'Meera Joshi', doctor: 'Dr. Arjun Mehta', specialty: 'Neurology', date: 'Today, 11:15 AM', status: 'Pending', code: 'APT-2042' },
  { patient: 'Kabir Shah', doctor: 'Dr. Sana Iqbal', specialty: 'Pediatrics', date: 'Today, 12:00 PM', status: 'Confirmed', code: 'APT-2043' },
  { patient: 'Isha Rao', doctor: 'Dr. Rohan Desai', specialty: 'Orthopedics', date: 'Tomorrow, 9:00 AM', status: 'Confirmed', code: 'APT-2044' },
  { patient: 'Vihaan Patel', doctor: 'Dr. Leena Shah', specialty: 'Dermatology', date: 'Tomorrow, 10:45 AM', status: 'Pending', code: 'APT-2045' },
]

export const demoBlood = [
  { group: 'O−', units: 8, status: 'Low stock', tone: 'red' },
  { group: 'O+', units: 24, status: 'Available', tone: 'green' },
  { group: 'A−', units: 12, status: 'Available', tone: 'green' },
  { group: 'A+', units: 31, status: 'Available', tone: 'green' },
  { group: 'B−', units: 6, status: 'Low stock', tone: 'red' },
  { group: 'B+', units: 19, status: 'Available', tone: 'green' },
  { group: 'AB−', units: 4, status: 'Low stock', tone: 'red' },
  { group: 'AB+', units: 11, status: 'Available', tone: 'green' },
]

export const demoWards = [
  { name: 'General ward', type: 'General', total: 48, available: 12, color: 'teal' },
  { name: 'Intensive care', type: 'ICU', total: 20, available: 3, color: 'violet' },
  { name: 'Maternity', type: 'Maternity', total: 24, available: 8, color: 'pink' },
  { name: 'Pediatrics', type: 'Pediatrics', total: 32, available: 11, color: 'amber' },
]

export const chartData = [
  { day: 'Mon', appointments: 31, admissions: 18 }, { day: 'Tue', appointments: 42, admissions: 24 },
  { day: 'Wed', appointments: 37, admissions: 20 }, { day: 'Thu', appointments: 54, admissions: 29 },
  { day: 'Fri', appointments: 47, admissions: 23 }, { day: 'Sat', appointments: 32, admissions: 16 },
  { day: 'Sun', appointments: 24, admissions: 12 },
]

export const demoMetrics = [
  { label: 'Appointments today', value: '128', delta: '+12.8%', icon: CalendarDays, color: 'blue' },
  { label: 'Available doctors', value: '24', delta: 'of 32 on roster', icon: Stethoscope, color: 'purple' },
  { label: 'Beds available', value: '34', delta: 'of 124 total', icon: BedDouble, color: 'green' },
  { label: 'Open requests', value: '07', delta: '3 need attention', icon: Droplets, color: 'orange' },
]

export const routeTitles: Record<string, { title: string; subtitle: string }> = {
  dashboard: { title: 'Good morning, Alex', subtitle: 'Here’s a look at what’s happening across your hospital today.' },
  doctors: { title: 'Find the right specialist', subtitle: 'Browse care teams and explore appointment availability.' },
  appointments: { title: 'Appointments', subtitle: 'Keep track of upcoming visits and care history.' },
  schedule: { title: 'Your schedule', subtitle: 'A clear view of today’s clinics and upcoming appointments.' },
  patients: { title: 'Patients', subtitle: 'Patient directory for your authorized care team.' },
  profile: { title: 'Your profile', subtitle: 'Review the account information available to your role.' },
  'blood-availability': { title: 'Blood availability', subtitle: 'Check current tested inventory by blood group and component.' },
  'bed-availability': { title: 'Bed availability', subtitle: 'See aggregate availability by ward and care level.' },
  'ai-assistant': { title: 'Medinex assistant', subtitle: 'Ask about hospital services and appointment steps in your preferred language.' },
  notifications: { title: 'Notifications', subtitle: 'Updates and reminders for your care journey.' },
  departments: { title: 'Departments', subtitle: 'Manage the services that make care possible.' },
  wards: { title: 'Wards & beds', subtitle: 'Monitor capacity across hospital wards.' },
  beds: { title: 'Bed availability', subtitle: 'Monitor capacity across hospital wards.' },
  'blood-bank': { title: 'Blood bank', subtitle: 'Review inventory levels across blood groups.' },
  'blood-requests': { title: 'Blood requests', subtitle: 'Track requests and coordinate with authorized staff.' },
  staff: { title: 'Staff directory', subtitle: 'Hospital team members and role assignments.' },
  reports: { title: 'Reports & analytics', subtitle: 'Review current hospital records and operational summaries.' },
  'audit-logs': { title: 'Audit log', subtitle: 'A preview of a traceable operations history.' },
  settings: { title: 'Workspace settings', subtitle: 'Configure preferences for your hospital workspace.' },
}

