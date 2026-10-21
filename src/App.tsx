import { useEffect, useState, createContext, useContext, type ButtonHTMLAttributes, type FormEvent, type InputHTMLAttributes, type ReactNode } from 'react'
import { Link, NavLink, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router'
import { motion } from 'motion/react'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import type { UseFormRegisterReturn } from 'react-hook-form'
import {
  addBloodInventory, askAssistant, bookAppointment, cancelAppointment, createBed,
  createBloodRequest, createDepartment, createDoctor, createDoctorSchedule, createWard,
  getDoctorAvailability, listAdminPatients, listAuditLogs, listBedAvailability,
  listBloodAvailability, listBloodRequests, listDepartments, listDoctors,
  listMyAppointments, listNotifications, markAllNotificationsRead, markNotificationRead,
  updateBloodRequest, type AppointmentRecord, type AuditLogRecord, type BedAvailabilityRecord,
  type BedStatus, type BloodAvailabilityRecord, type BloodComponent, type BloodRequestRecord,
  type DepartmentRecord, type DoctorRecord, type DoctorSlot, type NotificationRecord,
  type PatientDirectoryRecord, type UserRole,
} from './api'
import { AuthProvider, useAuth } from './auth'
import {
  Activity, ArrowDownRight, ArrowRight, ArrowUpRight, BadgeCheck, BedDouble, Bell,
  BriefcaseMedical, CalendarDays, ChartNoAxesCombined, Check, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, CircleHelp,
  Clock3, Droplets, FileDown, Filter, Heart, HeartPulse, LayoutGrid, LockKeyhole,
  LogOut, Menu, Moon, MoreHorizontal, Search, Send, Settings2, Shield,
  ShieldCheck, Sparkles, Stethoscope, Sun, Users, X, Zap,
  type LucideIcon,
} from 'lucide-react'
import {
  chartData, demoAppointments, demoBlood, demoDoctors, demoMetrics, demoWards,
  portalNavigation, roleLabels, routeTitles, type PortalRole,
} from './data'

type ToastFn = (message: string) => void
const ToastContext = createContext<ToastFn>(() => undefined)
const useToast = () => useContext(ToastContext)

function Button({ children, variant = 'primary', className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'quiet' | 'danger' }) {
  return <button className={`button button-${variant} ${className}`} {...props}>{children}</button>
}

function Brand({ inverse = false }: { inverse?: boolean }) {
  return <Link to="/" className={`brand ${inverse ? 'brand-inverse' : ''}`} aria-label="Medinex home">
    <span className="brand-mark"><HeartPulse size={19} strokeWidth={2.4} /></span>
    <span>medinex<span className="brand-ai">.ai</span></span>
  </Link>
}

function Toast({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  useEffect(() => { const timer = window.setTimeout(onDismiss, 3600); return () => window.clearTimeout(timer) }, [message, onDismiss])
  return <div className="toast" role="status"><CheckCircle2 size={17} /><span>{message}</span><button aria-label="Dismiss notification" onClick={onDismiss}><X size={15} /></button></div>
}

function PublicHeader() {
  const [open, setOpen] = useState(false)
  return <header className="public-header">
    <div className="public-nav container">
      <Brand />
      <nav className={`public-links ${open ? 'public-links-open' : ''}`} aria-label="Main navigation">
        <Link onClick={() => setOpen(false)} to="/features">Platform</Link>
        <a onClick={() => setOpen(false)} href="/#workflow">How it works</a>
        <Link onClick={() => setOpen(false)} to="/about">About</Link>
        <Link onClick={() => setOpen(false)} to="/contact">Contact</Link>
      </nav>
      <div className="public-actions"><Link className="nav-login" to="/login">Sign in</Link><Link className="button button-primary nav-cta" to="/register">Get started <ArrowRight size={15} /></Link></div>
      <button className="mobile-nav-toggle" aria-label="Toggle menu" onClick={() => setOpen(!open)}>{open ? <X /> : <Menu />}</button>
    </div>
  </header>
}

const featureCards: { icon: LucideIcon; title: string; body: string; className: string; symbol: string }[] = [
  { icon: Sparkles, title: 'A calmer way to coordinate care', body: 'Give patients and care teams one clear place to manage the next step.', className: 'bento-ai', symbol: '01' },
  { icon: CalendarDays, title: 'Appointments that fit', body: 'Make finding, booking and following up feel effortless.', className: 'bento-appointments', symbol: '02' },
  { icon: BedDouble, title: 'Capacity, at a glance', body: 'See aggregate ward and bed availability without the guesswork.', className: 'bento-beds', symbol: '03' },
  { icon: Droplets, title: 'Inventory with context', body: 'Keep blood stock levels and requests visible to authorized teams.', className: 'bento-blood', symbol: '04' },
  { icon: Users, title: 'Teams in sync', body: 'Connect doctors, staff and services around the work that matters.', className: 'bento-team', symbol: '05' },
  { icon: Activity, title: 'A clearer view of operations', body: 'Turn everyday activity into insights your team can act on.', className: 'bento-analytics', symbol: '06' },
]

function ProductPreview() {
  return <div className="product-preview" aria-label="Illustrative dashboard preview">
    <div className="preview-top"><div className="window-dots"><i /><i /><i /></div><span>medinex.ai <b>DEMO</b></span><MoreHorizontal size={17} /></div>
    <div className="preview-body">
      <aside className="preview-side"><div className="preview-logo"><HeartPulse size={14} /></div>{[LayoutGrid, CalendarDays, Users, BedDouble, Droplets, Settings2].map((Icon, i) => <span className={i === 0 ? 'active' : ''} key={i}><Icon size={13} /></span>)}</aside>
      <div className="preview-main"><div className="preview-greeting"><div><small>MONDAY, OCTOBER 19</small><h3>Good morning, Alex</h3></div><span className="preview-avatar">AM</span></div>
        <div className="preview-stats"><div><span>Appointments today</span><strong>128 <small>+12%</small></strong></div><div><span>Doctors available</span><strong>24 <small>of 32</small></strong></div><div><span>Beds available</span><strong>34 <small>of 124</small></strong></div></div>
        <div className="preview-grid"><div className="preview-chart"><div className="preview-card-head">Weekly appointments <span>This week⌄</span></div><svg viewBox="0 0 320 88" role="img" aria-label="Illustrative weekly appointments chart"><path d="M5 70 C 32 66, 38 42, 70 50 S 112 32, 135 40 S 177 21, 200 31 S 233 12, 258 22 S 292 8, 315 9" fill="none" stroke="#2b8580" strokeWidth="3" strokeLinecap="round"/><path d="M5 70 C 32 66, 38 42, 70 50 S 112 32, 135 40 S 177 21, 200 31 S 233 12, 258 22 S 292 8, 315 9 L315 88 L5 88Z" fill="url(#area)"/><defs><linearGradient id="area" x1="0" x2="0" y1="0" y2="1"><stop stopColor="#68bbb2" stopOpacity=".23"/><stop offset="1" stopColor="#68bbb2" stopOpacity="0"/></linearGradient></defs></svg><div className="preview-days"><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span></div></div>
          <div className="preview-list"><div className="preview-card-head">Next appointments <span>View all</span></div>{[['PN','Priya Nair','10:30 AM'],['AM','Arjun Mehta','11:15 AM'],['SI','Sana Iqbal','12:00 PM']].map(([initials,name,time],i) => <div className="preview-appointment" key={name}><span className={`avatar avatar-${i}`}>{initials}</span><span><strong>{name}</strong><small>Cardiology</small></span><time>{time}</time></div>)}</div>
        </div>
        <div className="preview-foot"><Sparkles size={12} /><span>Care coordination, made clearer.</span><span className="preview-foot-label">SAMPLE DATA</span></div>
      </div>
    </div>
  </div>
}

function LandingPage() {
  return <><PublicHeader /><main>
    <section className="hero-section">
      <div className="hero-orb hero-orb-one" /><div className="hero-orb hero-orb-two" />
      <div className="container hero-layout">
        <motion.div className="hero-copy" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .55 }}>
          <div className="eyebrow"><span className="eyebrow-dot" /> A MORE HUMAN WAY TO MANAGE CARE</div>
          <h1>Better care starts<br />with <span>better connection.</span></h1>
          <p>One thoughtful workspace for the people, appointments and operations that keep a hospital moving.</p>
          <div className="hero-buttons"><Link to="/register" className="button button-primary button-large">Explore Medinex <ArrowRight size={17} /></Link><Link to="/demo/patient/dashboard" className="button button-secondary button-large"><span className="play-mark">▷</span> View live demo</Link></div>
          <div className="hero-note"><ShieldCheck size={16} /><span>Designed around privacy, clarity and the people behind every visit.</span></div>
        </motion.div>
        <motion.div className="hero-visual" initial={{ opacity: 0, scale: .97, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ duration: .65, delay: .12 }}><div className="visual-glow" /><ProductPreview /><div className="floating-note floating-note-left"><span className="floating-icon floating-green"><Check size={14} /></span><span><strong>Care, in sync</strong><small>Everything in one view</small></span></div><div className="floating-note floating-note-right"><span className="floating-icon floating-lilac"><Sparkles size={14} /></span><span><strong>A little less busy</strong><small>Thoughtful by design</small></span></div></motion.div>
      </div>
      <div className="container hero-trust"><span>BUILT FOR THE EVERYDAY WORK OF CARE</span><div><span><HeartPulse size={17} /> PATIENTS</span><span><Stethoscope size={16} /> CARE TEAMS</span><span><LayoutGrid size={16} /> HOSPITALS</span></div></div>
    </section>
    <section className="intro-section section-pad"><div className="container intro-layout"><div><div className="eyebrow eyebrow-muted">THE WORKSPACE FOR HEALTHCARE</div><h2>Less time navigating.<br /><span>More time caring.</span></h2></div><div className="intro-copy"><p>Hospital work is connected. The tools behind it should be, too. Medinex brings the important details together, so teams can spend less time switching contexts and more time moving care forward.</p><Link className="text-link" to="/features">Explore the platform <ArrowRight size={15} /></Link></div></div></section>
    <section className="bento-section section-pad"><div className="container"><div className="section-heading"><div><div className="eyebrow eyebrow-muted">ONE CONNECTED PLATFORM</div><h2>Every detail has<br /><span>a place.</span></h2></div><p>Practical tools for the moments that shape a hospital day — designed to work better together.</p></div><div className="bento-grid">{featureCards.map(({ icon: Icon, title, body, className, symbol }, i) => <motion.article key={title} className={`bento-card ${className}`} initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: .12 }} transition={{ duration: .35, delay: i * .045 }}><div className="bento-card-top"><span className="feature-icon"><Icon size={19} /></span><span className="feature-number">{symbol}</span></div><h3>{title}</h3><p>{body}</p><div className="bento-graphic" aria-hidden="true">{className === 'bento-ai' ? <div className="ai-orbit"><Sparkles size={22} /><i /><i /><i /></div> : className === 'bento-appointments' ? <div className="mini-calendar"><div>OCTOBER <span>2026</span></div><section>{['M','T','W','T','F','S','S'].map((x, n) => <small key={`${x}${n}`}>{x}</small>)}{['12','13','14','15','16','17','18'].map((x) => <b key={x} className={x === '15' ? 'selected' : ''}>{x}</b>)}</section></div> : className === 'bento-beds' ? <div className="bed-stack"><span>GENERAL <b>12 open</b><i style={{ width: '65%' }} /></span><span>ICU <b>3 open</b><i style={{ width: '82%' }} /></span><span>MATERNITY <b>8 open</b><i style={{ width: '44%' }} /></span></div> : className === 'bento-blood' ? <div className="blood-pills"><b>O− <small>8</small></b><b>A+ <small>31</small></b><b>B+ <small>19</small></b><b>AB− <small>4</small></b></div> : className === 'bento-team' ? <div className="team-stack"><span>PN</span><span>AM</span><span>SI</span><span>RD</span><b>+12</b></div> : <div className="analytics-bars">{[44, 68, 53, 81, 63, 96, 72, 88].map((height, n) => <i key={n} style={{ height: `${height}%` }} />)}</div>}</div></motion.article>)}</div></div></section>
    <section id="workflow" className="workflow-section section-pad"><div className="container workflow-layout"><div className="workflow-copy"><div className="eyebrow">CARE THAT CONNECTS</div><h2>From the first question<br />to the next step.</h2><p>When information is clear and easy to find, every part of the visit feels more considered.</p><Link to="/features" className="button button-white">See how it works <ArrowRight size={15} /></Link></div><div className="workflow-steps"><div className="workflow-line" /><div className="workflow-step"><span className="step-icon"><Search size={18} /></span><div><small>01 — FIND</small><h3>Find the right care</h3><p>Explore doctors, specialties and upcoming times.</p></div></div><div className="workflow-step"><span className="step-icon"><CalendarDays size={18} /></span><div><small>02 — COORDINATE</small><h3>Make the next step simple</h3><p>Keep appointment details and follow-ups together.</p></div></div><div className="workflow-step"><span className="step-icon"><HeartPulse size={18} /></span><div><small>03 — CARE</small><h3>Keep people in the loop</h3><p>Help patients and teams stay on the same page.</p></div></div></div></div></section>
    <section className="security-section section-pad"><div className="container security-card"><div className="security-symbol"><ShieldCheck size={26} /></div><div><div className="eyebrow eyebrow-muted">PRIVACY, BUILT INTO THE EXPERIENCE</div><h2>Trust is part of the care.</h2><p>Medinex is designed for privacy-conscious workflows, with access and data controls intended for a secure backend implementation.</p></div><Link to="/about" className="text-link">Our approach <ArrowRight size={15} /></Link></div></section>
    <section className="cta-section"><div className="container cta-inner"><div className="cta-deco"><span /><span /><span /></div><div className="eyebrow">A CLEARER WAY FORWARD</div><h2>Make room for better care.</h2><p>Take a closer look at a more connected hospital workspace.</p><div className="hero-buttons"><Link to="/register" className="button button-white button-large">Get started <ArrowRight size={16} /></Link><Link to="/demo/patient/dashboard" className="cta-demo">Explore the demo <ArrowRight size={14} /></Link></div><small className="demo-disclaimer">This preview uses synthetic demo data. It is not connected to a hospital system.</small></div></section>
  </main><PublicFooter /></>
}

function PublicFooter() {
  return <footer className="public-footer"><div className="container footer-main"><div className="footer-brand"><Brand /><p>A more human way to manage care.</p></div><div className="footer-col"><strong>Platform</strong><Link to="/features">Features</Link><Link to="/demo/patient/dashboard">Live demo</Link><Link to="/register">Get started</Link></div><div className="footer-col"><strong>Company</strong><Link to="/about">About Medinex</Link><Link to="/contact">Contact</Link></div><div className="footer-note"><span className="demo-pill"><span /> DEMO ENVIRONMENT</span><p>Sample content only. No medical advice or live hospital data is provided.</p></div></div><div className="container footer-bottom"><span>© 2026 Medinex. Designed for better-connected care.</span><span><Link to="/about">Privacy approach</Link><Link to="/contact">Support</Link></span></div></footer>
}

function InfoPage({ page }: { page: 'features' | 'about' | 'contact' }) {
  const [sent, setSent] = useState(false)
  const content = {
    features: { kicker: 'THE MEDINEX PLATFORM', title: 'Thoughtful tools for the work of care.', text: 'A connected workspace that brings people, appointments and hospital operations into a clearer view.' },
    about: { kicker: 'ABOUT MEDINEX', title: 'Technology should make care feel more human.', text: 'Medinex is a product vision for a calmer, more connected hospital experience — from the first question to the follow-up.' },
    contact: { kicker: 'LET’S TALK', title: 'We’d love to hear what your team needs.', text: 'Tell us what you are working on. This contact form is a frontend preview and does not send messages yet.' },
  }[page]
  return <><PublicHeader /><main className="info-page"><div className="container"><div className="eyebrow eyebrow-muted">{content.kicker}</div><h1>{content.title}</h1><p className="info-lede">{content.text}</p>{page === 'features' ? <div className="info-feature-grid">{featureCards.map(({ icon: Icon, title, body }) => <article className="info-feature" key={title}><span className="feature-icon"><Icon size={19} /></span><h3>{title}</h3><p>{body}</p></article>)}</div> : page === 'about' ? <div className="about-points"><article><Shield size={20} /><h3>People first</h3><p>Clear and respectful workflows for patients and care teams.</p></article><article><Zap size={20} /><h3>Useful by design</h3><p>Practical tools for day-to-day coordination and operations.</p></article><article><BadgeCheck size={20} /><h3>Honest about data</h3><p>Demo content is labeled; real hospital information needs a configured backend.</p></article></div> : <form className="contact-form" onSubmit={(event) => { event.preventDefault(); setSent(true) }}><label>Your name<input required placeholder="Name" /></label><label>Work email<input type="email" required placeholder="you@hospital.org" /></label><label>What would you like to discuss?<textarea required rows={4} placeholder="Tell us a little about your team…" /></label><Button type="submit">Send message <ArrowRight size={15} /></Button>{sent && <p className="inline-notice">Thanks for reaching out. Message delivery will be available when a backend is connected.</p>}</form>}</div></main><PublicFooter /></>
}

const loginSchema = z.object({ email: z.email('Enter a valid email address.'), password: z.string().min(8, 'Use at least 8 characters.') })
const registerSchema = z.object({ name: z.string().min(2, 'Enter your full name.'), email: z.email('Enter a valid email address.'), password: z.string().min(10, 'Use at least 10 characters.') })
type LoginValues = z.infer<typeof loginSchema>
type RegisterValues = z.infer<typeof registerSchema>

function pathForRole(role: UserRole): string | null {
  if (role === 'admin' || role === 'patient' || role === 'doctor') return workspacePath(role, 'dashboard')
  return null
}

function workspacePath(role: PortalRole, page: string) {
  return `${role === 'admin' ? '/12admin' : `/${role}`}/${page}`
}

function userInitials(email?: string) {
  if (!email) return 'MD'
  const name = email.split('@')[0].replace(/[._-]+/g, ' ').trim()
  return name.split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? '').join('') || 'MD'
}

function AuthField({ label, registration, error, type, placeholder, autoComplete }: { label: string; registration: UseFormRegisterReturn; error?: string; type: string; placeholder: string; autoComplete: string }) {
  return <label className="form-field"><span>{label}</span><input type={type} autoComplete={autoComplete} placeholder={placeholder} {...registration} />{error && <small className="field-error">{error}</small>}</label>
}

function AuthPage({ kind, adminOnly = false }: { kind: 'login' | 'register' | 'forgot'; adminOnly?: boolean }) {
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const { user, ready, signInUser, registerPatientUser, signOut } = useAuth()
  const navigate = useNavigate()
  const login = useForm<LoginValues>({ resolver: zodResolver(loginSchema) })
  const register = useForm<RegisterValues>({ resolver: zodResolver(registerSchema) })
  const forgot = useForm<{ email: string }>({ resolver: zodResolver(z.object({ email: z.email('Enter a valid email address.') })) })
  const title = adminOnly && kind === 'login' ? 'Administrator sign in' : kind === 'login' ? 'Welcome back' : kind === 'register' ? 'Create your account' : 'Reset your password'
  const subtitle = adminOnly && kind === 'login' ? 'Use your hospital administrator account to open operations.' : kind === 'login' ? 'Patients and doctors use this shared sign-in portal.' : kind === 'register' ? 'Create a secure patient account.' : 'Enter your email and we’ll help you get back in.'
  useEffect(() => {
    if (ready && user && (adminOnly ? user.role === 'admin' : user.role === 'patient' || user.role === 'doctor')) {
      const destination = pathForRole(user.role)
      if (destination) navigate(destination, { replace: true })
    }
  }, [ready, user, adminOnly, navigate])
  const finishSignIn = async (user: Awaited<ReturnType<typeof signInUser>>) => {
    const destination = pathForRole(user.role)
    const roleAllowed = adminOnly ? user.role === 'admin' : user.role === 'patient' || user.role === 'doctor'
    if (!destination || !roleAllowed) {
      signOut()
      throw new Error(adminOnly ? 'This sign-in is for hospital administrators. Use the patient and doctor portal for other accounts.' : user.role === 'admin' ? 'Administrators, please sign in through /12admin.' : 'This account role is not available in the current workspace. Please contact your hospital administrator.')
    }
    navigate(destination, { replace: true })
  }
  const submitLogin = login.handleSubmit(async ({ email, password }) => {
    setError('')
    setBusy(true)
    try { await finishSignIn(await signInUser(email, password)) }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Sign-in failed. Please try again.') }
    finally { setBusy(false) }
  })
  const submitRegister = register.handleSubmit(async (values) => {
    setError('')
    setBusy(true)
    try { await finishSignIn(await registerPatientUser(values)) }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Account creation failed. Please try again.') }
    finally { setBusy(false) }
  })
  const submitForgot = forgot.handleSubmit(() => setError('Password reset is not configured yet. Please contact your hospital administrator.'))
  return <main className="auth-layout"><section className="auth-art"><div className="auth-art-glow" /><Brand inverse /><div className="auth-art-copy"><span className="eyebrow">A MORE HUMAN WAY TO MANAGE CARE</span><h1>Care moves<br />better <em>together.</em></h1><p>One thoughtful workspace for the people and details behind every visit.</p></div><div className="auth-art-foot"><ShieldCheck size={16} /> Built around clarity and privacy.</div></section><section className="auth-main"><div className="auth-mobile-brand"><Brand /></div><div className="auth-box"><Link to="/" className="back-link"><ChevronLeft size={15} /> Back to home</Link><div className="eyebrow eyebrow-muted">{adminOnly ? 'HOSPITAL OPERATIONS' : kind === 'register' ? 'JOIN MEDINEX' : 'YOUR WORKSPACE'}</div><h2>{title}</h2><p className="auth-subtitle">{subtitle}</p>
    {kind === 'login' ? <form onSubmit={submitLogin} noValidate><AuthField label="Email address" type="email" placeholder="you@example.com" autoComplete="email" registration={login.register('email')} error={login.formState.errors.email?.message} /><AuthField label="Password" type="password" placeholder="At least 10 characters" autoComplete="current-password" registration={login.register('password')} error={login.formState.errors.password?.message} /><div className="auth-forgot"><Link to={adminOnly ? '/12admin/forgot-password' : '/forgot-password'}>Forgot password?</Link></div><Button type="submit" className="auth-submit" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'} {!busy && <ArrowRight size={16} />}</Button></form> : kind === 'register' ? <form onSubmit={submitRegister} noValidate><AuthField label="Full name" type="text" placeholder="Your full name" autoComplete="name" registration={register.register('name')} error={register.formState.errors.name?.message} /><AuthField label="Email address" type="email" placeholder="you@example.com" autoComplete="email" registration={register.register('email')} error={register.formState.errors.email?.message} /><p className="field-hint">Patient accounts can sign up here. Doctors and staff accounts are provisioned by the hospital.</p><AuthField label="Password" type="password" placeholder="At least 10 characters" autoComplete="new-password" registration={register.register('password')} error={register.formState.errors.password?.message} /><Button type="submit" className="auth-submit" disabled={busy}>{busy ? 'Creating account…' : 'Create account'} {!busy && <ArrowRight size={16} />}</Button></form> : <form onSubmit={submitForgot} noValidate><AuthField label="Email address" type="email" placeholder="you@example.com" autoComplete="email" registration={forgot.register('email')} error={forgot.formState.errors.email?.message} /><Button type="submit" className="auth-submit">Continue <ArrowRight size={16} /></Button></form>}
    {error && <p className="field-error" role="alert">{error}</p>}
    {!adminOnly && <><div className="auth-divider"><span>OR PREVIEW THE PRODUCT</span></div><Link to="/demo/patient/dashboard" className="demo-button"><LayoutGrid size={16} /> Explore demo workspace <ArrowRight size={15} /></Link><p className="auth-switch">{kind === 'login' ? <>New to Medinex? <Link to="/register">Create an account</Link></> : <>Already have an account? <Link to="/login">Sign in</Link></>}</p></>}{adminOnly && <p className="auth-switch">Patient or doctor? <Link to="/login">Use the shared sign-in portal</Link></p>}<p className="auth-legal"><ShieldCheck size={13} /> Workspace access follows your hospital account role.</p>
  </div><div className="auth-bottom"><span>© 2026 Medinex</span><Link to="/contact">Need help?</Link></div></section></main>
}

function DemoBanner() { return <div className="demo-banner"><span className="demo-banner-dot" /> DEMO WORKSPACE <span className="demo-banner-detail">All names, counts and activity shown are synthetic sample data.</span></div> }

function MetricCard({ label, value, delta, icon: Icon, color, trend }: { label: string; value: string; delta: string; icon: LucideIcon; color: string; trend?: 'up' | 'down' }) {
  return <article className="metric-card"><div className="metric-top"><span>{label}</span><span className={`metric-icon metric-${color}`}><Icon size={17} /></span></div><div className="metric-value">{value}</div><div className="metric-delta">{trend === 'down' ? <ArrowDownRight size={14} /> : trend === 'up' ? <ArrowUpRight size={14} /> : <span className="metric-delta-neutral" />}<span>{delta}</span></div></article>
}

function StatusPill({ status }: { status: string }) {
  const normalized = status.toLowerCase().replaceAll(' ', '-')
  return <span className={`status-pill status-${normalized}`}><i />{status}</span>
}

function SectionTitle({ title, action }: { title: string; action?: ReactNode }) { return <div className="section-title"><h3>{title}</h3>{action}</div> }

function ActivityChart({ includeAdmissions = false }: { includeAdmissions?: boolean }) {
  const points = (key: 'appointments' | 'admissions') => chartData.map((item, index) => `${36 + index * 104},${187 - item[key] * 2.55}`).join(' ')
  const appointmentPoints = points('appointments')
  const admissionPoints = points('admissions')
  const appointmentArea = `M ${appointmentPoints.replaceAll(' ', ' L ')} L 660 190 L 36 190 Z`
  return <svg className="activity-chart-svg" viewBox="0 0 700 220" preserveAspectRatio="none" role="img" aria-label={includeAdmissions ? 'Illustrative weekly appointment and admission activity chart' : 'Illustrative weekly appointment activity chart'}>
    <defs><linearGradient id={includeAdmissions ? 'activityFillAdmin' : 'activityFillReport'} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#4c918a" stopOpacity=".17" /><stop offset="100%" stopColor="#4c918a" stopOpacity="0" /></linearGradient></defs>
    {[30, 78, 126, 174].map((y) => <line key={y} x1="36" x2="660" y1={y} y2={y} stroke="#edf0f2" strokeDasharray="4 5" />)}
    <path d={appointmentArea} fill={`url(#${includeAdmissions ? 'activityFillAdmin' : 'activityFillReport'})`} />
    {includeAdmissions && <polyline points={admissionPoints} fill="none" stroke="#aa98d4" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />}
    <polyline points={appointmentPoints} fill="none" stroke="#4c918a" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
    {[['60', 33], ['40', 81], ['20', 129], ['0', 177]].map(([label, y]) => <text key={label} x="24" y={y} textAnchor="end" fill="#a6afb0" fontSize="8">{label}</text>)}
    {chartData.map((item, index) => <text key={item.day} x={36 + index * 104} y="212" textAnchor="middle" fill="#91999f" fontSize="10">{item.day}</text>)}
  </svg>
}

function Dashboard({ role, appointments, appointmentRecords = [], doctors = [], onBook, demo = false, loadingAppointments = false, unreadNotifications = 0, user, routeFor }: { role: PortalRole; appointments: typeof demoAppointments; appointmentRecords?: AppointmentRecord[]; doctors?: DoctorRecord[]; onBook: () => void; demo?: boolean; loadingAppointments?: boolean; unreadNotifications?: number; user?: ReturnType<typeof useAuth>['user']; routeFor: (page: string) => string }) {
  const [bedRows, setBedRows] = useState<BedAvailabilityRecord[]>([])
  const [bloodRows, setBloodRows] = useState<BloodAvailabilityRecord[]>([])
  const [loadingResources, setLoadingResources] = useState(!demo)
  const [resourceError, setResourceError] = useState('')
  useEffect(() => {
    if (demo) return
    let active = true
    setLoadingResources(true)
    setResourceError('')
    Promise.all([listBedAvailability(), role === 'admin' ? listBloodAvailability() : Promise.resolve([])])
      .then(([beds, blood]) => { if (active) { setBedRows(beds); setBloodRows(blood) } })
      .catch((cause) => { if (active) setResourceError(cause instanceof Error ? cause.message : 'Could not load current hospital resources.') })
      .finally(() => { if (active) setLoadingResources(false) })
    return () => { active = false }
  }, [demo, role])
  const patient = role === 'patient'
  const doctor = role === 'doctor'
  const accountName = user?.email.split('@')[0].replace(/[._-]+/g, ' ') ?? ''
  const greeting = demo ? patient ? 'Welcome back, Maya' : doctor ? 'Good morning, Dr. Ananya' : 'Good morning, Alex' : patient ? `Welcome${accountName ? `, ${accountName}` : ''}` : doctor ? 'Your care team overview' : 'Hospital operations overview'
  const description = patient ? 'Here’s what’s coming up in your care.' : doctor ? 'Your appointments and patient schedule for the day.' : 'A current view of hospital appointments, staffing and capacity.'
  const currentTime = Date.now()
  const todayAppointments = appointmentRecords.filter((item) => new Date(item.start_at).toDateString() === new Date().toDateString() && !['cancelled', 'completed'].includes(item.status.toLowerCase()))
  const upcomingAppointments = appointmentRecords.filter((item) => new Date(item.start_at).getTime() >= currentTime && !['cancelled', 'completed'].includes(item.status.toLowerCase())).sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime())
  const displayedAppointments = doctor ? todayAppointments.sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime()) : upcomingAppointments
  const availableBeds = bedRows.reduce((sum, item) => sum + item.available_beds, 0)
  const totalBeds = bedRows.reduce((sum, item) => sum + item.total_beds, 0)
  const occupiedBeds = bedRows.reduce((sum, item) => sum + item.occupied_beds, 0)
  const bloodUnits = bloodRows.reduce((sum, item) => sum + item.units_available, 0)
  const demoPatientMetrics = [
    { label: 'Upcoming visits', value: '2', delta: 'Next: today at 3:30 PM', icon: CalendarDays, color: 'blue' },
    { label: 'Care team', value: '4', delta: 'Across 3 specialties', icon: Stethoscope, color: 'purple' },
    { label: 'Notifications', value: '3', delta: '1 new reminder', icon: Bell, color: 'orange' },
    { label: 'Health records', value: '8', delta: 'Updated this month', icon: Heart, color: 'green' },
  ]
  const demoDoctorMetrics = [
    { label: 'Today’s visits', value: '12', delta: '4 remaining', icon: CalendarDays, color: 'blue' },
    { label: 'Patients seen', value: '08', delta: '+2 from yesterday', icon: Users, color: 'purple' },
    { label: 'Clinic hours', value: '6.5h', delta: 'Ends at 4:30 PM', icon: Clock3, color: 'green' },
    { label: 'Follow-ups', value: '03', delta: 'Need attention', icon: Activity, color: 'orange' },
  ]
  const liveMetrics = patient ? [
    { label: 'Upcoming visits', value: loadingAppointments ? '…' : String(upcomingAppointments.length), delta: upcomingAppointments[0] ? `Next: ${formatSlotTime(upcomingAppointments[0].start_at)}` : 'No upcoming appointments', icon: CalendarDays, color: 'blue' },
    { label: 'Doctors listed', value: String(doctors.length), delta: 'Current directory', icon: Stethoscope, color: 'purple' },
    { label: 'Unread notifications', value: String(unreadNotifications), delta: 'Account updates', icon: Bell, color: 'orange' },
    { label: 'Health records', value: '—', delta: 'Records service not connected', icon: Heart, color: 'green' },
  ] : doctor ? [
    { label: 'Today’s visits', value: loadingAppointments ? '…' : String(todayAppointments.length), delta: 'From your appointment list', icon: CalendarDays, color: 'blue' },
    { label: 'Linked patients', value: String(new Set(appointmentRecords.map((item) => item.patient_id)).size), delta: 'Identified by account ID', icon: Users, color: 'purple' },
    { label: 'Clinic hours', value: '—', delta: 'Schedule details not exposed', icon: Clock3, color: 'green' },
    { label: 'Follow-ups', value: '—', delta: 'Care notes not connected', icon: Activity, color: 'orange' },
  ] : [
    { label: 'Appointments today', value: loadingAppointments ? '…' : String(todayAppointments.length), delta: 'Current hospital records', icon: CalendarDays, color: 'blue' },
    { label: 'Active doctors', value: String(doctors.length), delta: 'Current directory', icon: Stethoscope, color: 'purple' },
    { label: 'Beds available', value: loadingResources ? '…' : String(availableBeds), delta: `of ${totalBeds} registered beds`, icon: BedDouble, color: 'green' },
    { label: 'Tested blood stock', value: loadingResources ? '…' : String(bloodUnits), delta: 'Available unexpired units', icon: Droplets, color: 'orange' },
  ]
  const metrics = demo ? patient ? demoPatientMetrics : doctor ? demoDoctorMetrics : demoMetrics : liveMetrics
  const visitSource = demo ? appointments : displayedAppointments.flatMap((record) => {
    const row = appointments.find((item) => `APT-${record.id.slice(0, 8).toUpperCase()}` === item.code)
    return row ? [row] : []
  })
  const visits = (patient ? visitSource.slice(0, 2) : doctor ? visitSource.slice(0, 4) : visitSource.slice(0, 5))
  const occupancy = totalBeds ? Math.round(occupiedBeds / totalBeds * 100) : 0
  return <>
    <div className="page-heading"><div><div className="eyebrow eyebrow-muted">{new Intl.DateTimeFormat('en', { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date())}</div><h1>{greeting}</h1><p>{description}</p></div><Button onClick={onBook}><CalendarDays size={16} /> {patient ? 'Book an appointment' : doctor ? 'View schedule' : 'Appointments'} <ArrowRight size={15} /></Button></div>
    <div className="metrics-grid">{metrics.map((metric) => <MetricCard key={metric.label} {...metric} />)}</div>
    <div className="dashboard-main-grid"><section className="panel chart-panel"><SectionTitle title={demo ? patient ? 'Your care activity' : 'Appointments this week' : 'Live operations'} /><div className="chart-legend">{demo ? <><span><i /> Appointments</span><span><i className="legend-soft" /> Admissions</span></> : <span><i /> Current connected data</span>}</div><div className="chart-area">{demo ? <ActivityChart includeAdmissions /> : <div className="chart-empty"><Sparkles size={19} /><strong>Live records are ready</strong><span>Historical charts need a reporting endpoint. Current appointments, doctors and availability are shown in this workspace.</span></div>}</div></section>
      <section className="panel capacity-panel"><SectionTitle title={patient ? 'Care at a glance' : 'Capacity at a glance'} action={<Link className="icon-link" to={routeFor(patient ? 'bed-availability' : 'wards')}><ArrowRight size={15} /></Link>} /><div className="capacity-total"><strong>{demo ? '74' : loadingResources ? '…' : totalBeds ? occupancy : '—'}{(demo || !loadingResources && totalBeds > 0) && <span>%</span>}</strong><span>aggregate occupancy</span></div><div className="capacity-ring-wrap"><div className="capacity-ring" style={!demo && !loadingResources ? { background: `conic-gradient(#58a095 0 ${occupancy}%, #e7efed ${occupancy}% 100%)` } : undefined}><div><strong>{demo ? '34' : loadingResources ? '…' : availableBeds}</strong><span>available</span></div></div></div><div className="capacity-legend"><span><i className="cap-used" /> Occupied <b>{demo ? '90' : loadingResources ? '…' : occupiedBeds}</b></span><span><i className="cap-free" /> Available <b>{demo ? '34' : loadingResources ? '…' : availableBeds}</b></span></div><div className="capacity-caption"><span><LockKeyhole size={12} /> {demo ? 'Aggregate sample count' : resourceError ? 'Hospital resources unavailable' : 'Aggregate hospital inventory'}</span></div></section></div>
    <div className="dashboard-bottom-grid"><section className="panel appointments-panel"><SectionTitle title={patient ? 'Upcoming appointments' : doctor ? 'Today’s appointments' : 'Recent appointments'} action={<Link className="text-link small-link" to={routeFor('appointments')}>View all <ArrowRight size={14} /></Link>} />{loadingAppointments && !demo ? <EmptyState icon={CalendarDays} title="Loading appointments" body="Fetching appointments connected to your account." /> : <AppointmentTable appointments={visits} role={role} compact />}</section><section className="panel activity-panel"><SectionTitle title={demo ? patient ? 'Your care team' : doctor ? 'Care notes' : 'Operational updates' : 'Workspace updates'} />{demo ? <ActivityList role={role} /> : <EmptyState icon={Bell} title="Audit activity is not on this dashboard" body="Appointment updates and reminders are available on your notifications page." />}</section></div>
  </>
}

function AppointmentTable({ appointments, role, compact = false }: { appointments: typeof demoAppointments; role: PortalRole; compact?: boolean }) {
  return appointments.length === 0 ? <EmptyState icon={CalendarDays} title="No appointments match" body="Try adjusting your search or date filter." /> : <div className="table-scroll"><table className={`data-table ${compact ? 'table-compact' : ''}`}><thead><tr><th>{role === 'patient' ? 'Care provider' : 'Patient'}</th><th>Specialty</th><th>Date & time</th><th>Status</th>{!compact && <th>Reference</th>}</tr></thead><tbody>{appointments.map((appointment) => <tr key={appointment.code}><td><div className="person-cell"><span className="table-avatar">{role === 'patient' ? appointment.doctor.split(' ').slice(-2).map((x) => x[0]).join('') : appointment.patient.split(' ').map((x) => x[0]).join('')}</span><span><strong>{role === 'patient' ? appointment.doctor : appointment.patient}</strong><small>{role === 'patient' ? appointment.code : 'General visit'}</small></span></div></td><td>{appointment.specialty}</td><td>{appointment.date}</td><td><StatusPill status={appointment.status} /></td>{!compact && <td className="table-code">{appointment.code}</td>}</tr>)}</tbody></table></div>
}

function ActivityList({ role }: { role: PortalRole }) {
  const events = role === 'patient' ? [
    ['reminder', 'Appointment reminder', 'Dr. Priya Nair · Today at 3:30 PM', '10 min ago'],
    ['record', 'Visit summary is ready', 'Your last visit · 12 Oct 2026', 'Yesterday'],
    ['care', 'Care team updated', 'Dr. Arjun Mehta joined your team', '12 Oct'],
  ] : role === 'doctor' ? [
    ['schedule', 'Schedule updated', 'Your clinic now starts at 9:30 AM', '15 min ago'],
    ['patient', 'Follow-up requested', 'A patient requested a review visit', '1 hour ago'],
    ['note', 'Care plan shared', 'A care plan was shared with you', 'Yesterday'],
  ] : [
    ['appointment', 'Appointment confirmed', 'Cardiology · APT-2041', '10 min ago'],
    ['blood', 'Low inventory alert', 'O− inventory needs review', '32 min ago'],
    ['bed', 'Bed status updated', 'General ward · 2 beds released', '1 hour ago'],
  ]
  return <div className="activity-list">{events.map(([type, title, text, time], i) => <div className="activity-item" key={title}><span className={`activity-icon activity-${type}`}>{type === 'blood' ? <Droplets size={15} /> : type === 'bed' ? <BedDouble size={15} /> : type === 'appointment' || type === 'schedule' || type === 'reminder' ? <CalendarDays size={15} /> : <CheckCircle2 size={15} />}</span><div><strong>{title}</strong><p>{text}</p><small>{time}</small></div><span className={`unread-dot ${i === 0 ? 'is-unread' : ''}`} /></div>)}</div>
}

function EmptyState({ icon: Icon, title, body, action }: { icon: LucideIcon; title: string; body: string; action?: ReactNode }) {
  return <div className="empty-state"><span><Icon size={20} /></span><h3>{title}</h3><p>{body}</p>{action}</div>
}

function DoctorDirectory({ onBook, search, doctors, loading, error, demo }: { onBook: (doctor?: string) => void; search: string; doctors: DoctorRecord[]; loading: boolean; error: string; demo: boolean }) {
  const [specialty, setSpecialty] = useState('All specialties')
  const [sort, setSort] = useState('Recommended')
  const cards = demo
    ? demoDoctors.map((item) => ({ id: item.name, name: item.name, specialty: item.specialty, initials: item.initials, tone: item.tone, rating: item.rating, experience: item.experience, location: item.location, availability: item.availability }))
    : doctors.map((item, index) => ({ id: item.id, name: item.full_name, specialty: item.specialization, initials: item.full_name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase(), tone: ['mint', 'lavender', 'peach', 'blue', 'rose'][index % 5], rating: '', experience: '', location: 'Hospital directory', availability: 'Choose a date to view live slots' }))
  const specialties = ['All specialties', ...new Set(cards.map((doctor) => doctor.specialty))]
  let filteredDoctors = cards.filter((doctor) => (specialty === 'All specialties' || doctor.specialty === specialty) && `${doctor.name} ${doctor.specialty} ${doctor.location}`.toLowerCase().includes(search.toLowerCase()))
  if (demo && sort === 'Experience') filteredDoctors = [...filteredDoctors].sort((a, b) => Number.parseInt(b.experience) - Number.parseInt(a.experience))
  if (demo && sort === 'Rating') filteredDoctors = [...filteredDoctors].sort((a, b) => Number(b.rating) - Number(a.rating))
  return <><div className="doctor-toolbar"><div className="filter-pills">{specialties.map((item) => <button key={item} className={specialty === item ? 'filter-pill active' : 'filter-pill'} onClick={() => setSpecialty(item)}>{item}</button>)}</div><label className="sort-select"><Filter size={14} /><select value={sort} onChange={(event) => setSort(event.target.value)}><option>Recommended</option>{demo && <><option>Experience</option><option>Rating</option></>}</select><ChevronDown size={13} /></label></div>{error && <p className="field-error" role="alert">{error}</p>}{loading ? <EmptyState icon={Stethoscope} title="Loading hospital directory" body="Fetching the current doctor list." /> : filteredDoctors.length ? <div className="doctor-grid">{filteredDoctors.map((doctor) => <article className="doctor-card" key={doctor.id}><div className="doctor-card-top"><span className={`doctor-avatar avatar-${doctor.tone}`}>{doctor.initials}</span><button className="icon-link" aria-label={`More about ${doctor.name}`}><MoreHorizontal size={18} /></button></div><h3>{doctor.name}</h3><p className="doctor-specialty">{doctor.specialty}{doctor.experience && <> <span>·</span> {doctor.experience}</>}</p>{doctor.rating ? <div className="doctor-rating"><span>★</span> {doctor.rating} <small>patient rating</small></div> : <div className="doctor-rating"><small>Hospital directory listing</small></div>}<div className="doctor-location"><span className="location-pin" />{doctor.location}</div><div className="doctor-card-availability"><span><CalendarDays size={14} /> {demo ? 'Next available' : 'Availability'}</span><strong>{doctor.availability}</strong></div><Button variant="secondary" onClick={() => onBook(doctor.id)}>Book a visit <ArrowRight size={15} /></Button></article>)}</div> : <EmptyState icon={Search} title={demo ? 'No specialists found' : 'No doctors listed yet'} body={demo ? 'Try a different name or specialty.' : 'The hospital directory has no matching doctors right now.'} />}</>
}

function localDateValue() {
  const now = new Date()
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset())
  return now.toISOString().slice(0, 10)
}

function formatSlotTime(value: string) {
  return new Date(value).toLocaleTimeString('en', { hour: 'numeric', minute: '2-digit' })
}

function displayAppointment(record: AppointmentRecord, doctors: DoctorRecord[]) {
  const provider = doctors.find((item) => item.id === record.doctor_id)
  const status = record.status.charAt(0).toUpperCase() + record.status.slice(1)
  return {
    patient: 'You',
    doctor: provider?.full_name ?? 'Hospital doctor',
    specialty: provider?.specialization ?? 'Specialty not listed',
    date: `${new Date(record.start_at).toLocaleDateString('en', { month: 'short', day: 'numeric' })}, ${formatSlotTime(record.start_at)}`,
    status,
    code: `APT-${record.id.slice(0, 8).toUpperCase()}`,
  }
}

function BookModal({ open, doctor, doctors, demo, onClose, onBook }: { open: boolean; doctor?: string; doctors: DoctorRecord[]; demo: boolean; onClose: () => void; onBook: (appointment: typeof demoAppointments[number], record?: AppointmentRecord) => void }) {
  const [selectedDoctor, setSelectedDoctor] = useState(doctor ?? (demo ? demoDoctors[0].name : doctors[0]?.id ?? ''))
  const [selectedTime, setSelectedTime] = useState(demo ? '3:30 PM' : '')
  const [date, setDate] = useState(localDateValue())
  const [slots, setSlots] = useState<DoctorSlot[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [bookingError, setBookingError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const { token } = useAuth()
  const notify = useToast()

  useEffect(() => {
    if (!open) return
    setSelectedDoctor(doctor ?? (demo ? demoDoctors[0].name : doctors[0]?.id ?? ''))
    setDone(false)
    setBookingError('')
  }, [open, doctor, demo, doctors])
  useEffect(() => {
    if (!open || demo || !selectedDoctor || !date) return
    let active = true
    setLoadingSlots(true)
    setBookingError('')
    setSlots([])
    setSelectedTime('')
    getDoctorAvailability(selectedDoctor, date)
      .then((result) => {
        if (!active) return
        setSlots(result.slots)
        setSelectedTime(result.slots[0]?.start_at ?? '')
      })
      .catch((cause) => { if (active) setBookingError(cause instanceof Error ? cause.message : 'Could not load appointment times.') })
      .finally(() => { if (active) setLoadingSlots(false) })
    return () => { active = false }
  }, [open, demo, selectedDoctor, date])
  useEffect(() => { if (!open) { setDone(false); return } const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }; window.addEventListener('keydown', closeOnEscape); return () => window.removeEventListener('keydown', closeOnEscape) }, [open, onClose])
  if (!open) return null

  const demoDoctor = demoDoctors.find((item) => item.name === selectedDoctor) ?? demoDoctors[0]
  const liveDoctor = doctors.find((item) => item.id === selectedDoctor)
  const doctorName = demo ? demoDoctor.name : liveDoctor?.full_name ?? 'Select a hospital doctor'
  const doctorSpecialty = demo ? demoDoctor.specialty : liveDoctor?.specialization ?? 'Hospital directory'
  const doctorInitials = demo ? demoDoctor.initials : doctorName.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase()
  const doctorTone = demo ? demoDoctor.tone : 'mint'
  const times = demo ? ['9:00 AM', '10:30 AM', '1:15 PM', '3:30 PM'] : slots.map((slot) => slot.start_at)
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setBookingError('')
    if (demo) {
      const value = { patient: 'Maya Demo', doctor: doctorName, specialty: doctorSpecialty, date: `${new Date(`${date}T12:00:00`).toLocaleDateString('en', { month: 'short', day: 'numeric' })}, ${selectedTime}`, status: 'Demo only', code: `DEMO-${Date.now().toString().slice(-4)}` }
      onBook(value)
      setDone(true)
      notify('Preview only: this appointment is saved in this demo session.')
      return
    }
    if (!token || !selectedDoctor || !selectedTime) {
      setBookingError('Choose a doctor and an available time first.')
      return
    }
    setSubmitting(true)
    try {
      const appointment = await bookAppointment({ doctor_id: selectedDoctor, start_at: selectedTime }, token)
      onBook({ patient: 'You', doctor: doctorName, specialty: doctorSpecialty, date: `${new Date(appointment.start_at).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })}, ${formatSlotTime(appointment.start_at)}`, status: appointment.status, code: `APT-${appointment.id.slice(0, 8).toUpperCase()}` }, appointment)
      setDone(true)
      notify('Your appointment is confirmed.')
    } catch (cause) {
      setBookingError(cause instanceof Error ? cause.message : 'Could not book this appointment. Please choose another slot.')
    } finally {
      setSubmitting(false)
    }
  }

  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}><section role="dialog" aria-modal="true" aria-labelledby="booking-title" className="booking-modal"><div className="modal-top"><div><span className="eyebrow eyebrow-muted">APPOINTMENT REQUEST</span><h2 id="booking-title">Book a visit</h2></div><button className="icon-button" aria-label="Close dialog" onClick={onClose}><X size={19} /></button></div>{done ? <div className="booking-success"><span><CheckCircle2 size={25} /></span><h3>{demo ? 'Preview appointment added' : 'Appointment confirmed'}</h3><p>{demo ? `Your demo visit with ${doctorName} is shown in this session only.` : `Your appointment with ${doctorName} is confirmed in the hospital schedule.`}</p><Button onClick={onClose}>Done <Check size={15} /></Button></div> : <form onSubmit={submit} className="booking-form"><div className="selected-doctor"><span className={`doctor-avatar avatar-${doctorTone}`}>{doctorInitials}</span><div><strong>{doctorName}</strong><span>{doctorSpecialty}{demo && ` · ${demoDoctor.experience}`}</span></div><BadgeCheck size={17} /></div><label className="form-field"><span>Specialist</span><select value={selectedDoctor} onChange={(event) => setSelectedDoctor(event.target.value)} disabled={!demo && !doctors.length}>{demo ? demoDoctors.map((item) => <option key={item.name} value={item.name}>{item.name}</option>) : doctors.map((item) => <option key={item.id} value={item.id}>{item.full_name} · {item.specialization}</option>)}</select></label><label className="form-field"><span>Choose a date</span><input type="date" value={date} min={localDateValue()} onChange={(event) => setDate(event.target.value)} required /></label><div className="form-field"><span>{demo ? 'Available demo times' : loadingSlots ? 'Loading available times…' : 'Available times'}</span><div className="time-options">{times.length ? times.map((time) => <button type="button" key={time} className={selectedTime === time ? 'time-option selected' : 'time-option'} onClick={() => setSelectedTime(time)}>{demo ? time : formatSlotTime(time)}</button>) : <small className="field-hint">{demo ? 'No times listed.' : 'No available slots for this date. Try another day.'}</small>}</div></div>{!demo && <div className="demo-hint"><CircleHelp size={15} /> The schedule is checked again when you confirm your booking.</div>}{demo && <div className="demo-hint"><CircleHelp size={15} /> Sample slots for interface preview. No live availability check is connected.</div>}{bookingError && <p className="field-error" role="alert">{bookingError}</p>}<Button type="submit" className="full-width" disabled={submitting || (!demo && (!selectedTime || loadingSlots))}>{submitting ? 'Confirming…' : demo ? 'Continue' : 'Confirm appointment'} <ArrowRight size={15} /></Button></form>}</section></div>
}

function BloodAvailability({ admin = false, demo = false }: { admin?: boolean; demo?: boolean }) {
  const { token } = useAuth()
  const [filter, setFilter] = useState('All groups')
  const [inventory, setInventory] = useState<BloodAvailabilityRecord[]>([])
  const [loading, setLoading] = useState(!demo)
  const [error, setError] = useState('')
  const [refresh, setRefresh] = useState(0)
  const [createOpen, setCreateOpen] = useState(false)
  const [pendingRequests, setPendingRequests] = useState<number | null>(null)
  const notify = useToast()
  useEffect(() => {
    if (demo) return
    let active = true
    setLoading(true)
    setError('')
    listBloodAvailability()
      .then((rows) => { if (active) setInventory(rows) })
      .catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : 'Could not load blood availability.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [demo, refresh])
  useEffect(() => {
    if (!admin || demo || !token) return
    let active = true
    listBloodRequests(token, 'pending')
      .then((result) => { if (active) setPendingRequests(result.total) })
      .catch(() => { if (active) setPendingRequests(null) })
    return () => { active = false }
  }, [admin, demo, token, refresh])

  const groups = demo
    ? demoBlood.filter((item) => filter === 'All groups' || (filter === 'Low stock' ? item.status === 'Low stock' : item.status === 'Available'))
    : Object.values(inventory.reduce<Record<string, { group: string; units: number; status: string; tone: string }>>((all, item) => {
      const key = `${item.blood_group} · ${item.component.replaceAll('_', ' ')}`
      const existing = all[key] ?? { group: key, units: 0, status: 'Available', tone: 'green' }
      existing.units += item.units_available
      all[key] = existing
      return all
    }, {}))
  const totalUnits = groups.reduce((sum, item) => sum + item.units, 0)
  const groupCount = demo ? groups.length : new Set(inventory.map((item) => item.blood_group)).size
  return <>
    {admin && !demo && <div className="inventory-admin-actions"><Button onClick={() => setCreateOpen(true)}>Receive blood stock <Droplets size={15} /></Button></div>}
    <div className="inventory-summary">
      <div className="inventory-highlight"><div className="inventory-highlight-icon"><Droplets size={20} /></div><div><span>{demo ? 'Total sample inventory' : 'Available inventory'}</span><strong>{loading ? '…' : totalUnits} <small>units</small></strong><p>{demo ? 'Illustrative counts across 8 blood groups' : `${groupCount} blood groups in hospital stock`}</p></div></div>
      <div className="inventory-mini"><span>{demo ? 'Low stock groups' : 'Blood groups listed'}</span><strong>{demo ? <>3 <small>of 8</small></> : loading ? '…' : groupCount}</strong>{demo ? <StatusPill status="Attention" /> : <span className="inventory-footnote">Tested, unexpired stock only</span>}</div>
      <div className="inventory-mini"><span>{admin ? 'Pending requests' : 'Need blood support?'}</span>{admin && !demo ? <><strong>{pendingRequests ?? '—'}</strong><Link className="inventory-footnote" to="/12admin/blood-requests">Open request queue <ArrowRight size={12} /></Link></> : demo && admin ? <><strong>07</strong><span className="inventory-footnote">Sample requests to review</span></> : <span className="inventory-footnote">Contact your hospital care team</span>}</div>
    </div>
    <div className="panel inventory-panel">
      <div className="panel-toolbar"><SectionTitle title="Inventory by blood group and component" action={<label className="sort-select"><Filter size={14} /><select value={filter} onChange={(event) => setFilter(event.target.value)}><option>All groups</option>{demo && <><option>Available</option><option>Low stock</option></>}</select><ChevronDown size={13} /></label>} /></div>
      {error && <p className="field-error" role="alert">{error}</p>}
      {loading ? <EmptyState icon={Droplets} title="Loading blood availability" body="Fetching the current hospital inventory." /> : groups.length ? <div className="blood-grid">{groups.map((item) => <article className={`blood-card ${item.tone === 'red' ? 'blood-low' : ''}`} key={item.group}><span className="blood-icon"><Droplets size={17} /></span><strong>{item.group}</strong><span className="blood-units"><b>{item.units}</b> {demo ? 'demo units' : 'units available'}</span><div className="blood-card-foot"><StatusPill status={item.status} />{demo && admin && <button className="table-action" onClick={() => notify(`Preview only: ${item.group} selected for follow-up.`)}>Review</button>}</div></article>)}</div> : <EmptyState icon={Droplets} title="No inventory listed" body="The hospital has no available, tested stock in this category right now." />}
      <div className="inventory-disclaimer"><ShieldCheck size={15} /><span>{demo ? 'Sample inventory only. This is not verified live stock or clinical compatibility guidance.' : 'Counts include available, tested and unexpired stock. Qualified hospital personnel must confirm any release decision.'}</span></div>
    </div>
    {admin && !demo && createOpen && <AdminCreateModal kind="blood" onClose={() => setCreateOpen(false)} onSaved={() => { setRefresh((value) => value + 1); notify('Blood stock batch received.') }} />}
  </>
}

function BedAvailability({ admin = false, demo = false }: { admin?: boolean; demo?: boolean }) {
  const [liveWards, setLiveWards] = useState<BedAvailabilityRecord[]>([])
  const [loading, setLoading] = useState(!demo)
  const [error, setError] = useState('')
  const [refresh, setRefresh] = useState(0)
  const [createKind, setCreateKind] = useState<'ward' | 'bed' | null>(null)
  const [selectedWard, setSelectedWard] = useState<string>()
  const notify = useToast()
  useEffect(() => {
    if (demo) return
    let active = true
    setLoading(true)
    setError('')
    listBedAvailability()
      .then((rows) => { if (active) setLiveWards(rows) })
      .catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : 'Could not load bed availability.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [demo, refresh])

  const wards = demo
    ? demoWards.map((ward) => ({ ward_id: '', ward: ward.name, ward_type: ward.type, total_beds: ward.total, available_beds: ward.available, occupied_beds: ward.total - ward.available, color: ward.color }))
    : liveWards.map((ward, index) => ({ ...ward, color: ['teal', 'violet', 'pink', 'amber'][index % 4] }))
  const total = wards.reduce((sum, ward) => sum + ward.total_beds, 0)
  const available = wards.reduce((sum, ward) => sum + ward.available_beds, 0)
  const occupancy = total ? Math.round((total - available) / total * 100) : 0
  return <>
    {admin && !demo && <div className="inventory-admin-actions"><Button onClick={() => setCreateKind('ward')}>Add ward <BedDouble size={15} /></Button></div>}
    <div className="inventory-summary bed-summary"><div className="inventory-highlight"><div className="inventory-highlight-icon bed-highlight"><BedDouble size={20} /></div><div><span>Available across wards</span><strong>{loading ? '…' : available} <small>of {loading ? '…' : total}{demo ? ' demo' : ''} beds</small></strong><p>{demo ? 'Aggregate, illustrative availability' : 'Aggregate count from hospital inventory'}</p></div></div><div className="inventory-mini"><span>Occupancy</span><strong>{loading ? '…' : occupancy}<small>{loading ? '' : '%'}</small></strong><div className="mini-progress"><i style={{ width: `${loading ? 0 : occupancy}%` }} /></div></div><div className="inventory-mini"><span>Last updated</span><strong>{demo ? '—' : loading ? '…' : 'Live'}</strong><span className="inventory-footnote">{demo ? admin ? 'Staff view · sample operations' : 'No live feed connected' : 'Hospital inventory service'}</span></div></div>
    {error && <p className="field-error" role="alert">{error}</p>}
    {loading ? <EmptyState icon={BedDouble} title="Loading bed availability" body="Fetching aggregate ward counts." /> : wards.length ? <div className="ward-grid">{wards.map((ward) => <article className="ward-card" key={ward.ward}><div className={`ward-illustration ward-${ward.color}`}><BedDouble size={24} /><span>{ward.ward_type}</span></div><div className="ward-title"><div><h3>{ward.ward}</h3><span>{ward.total_beds} total beds{demo ? ' · Demo' : ''}</span></div>{admin && !demo ? <button className="table-action" onClick={() => { setSelectedWard(ward.ward_id); setCreateKind('bed') }}>+ Add bed</button> : <button className="icon-link" aria-label={`More about ${ward.ward}`}><MoreHorizontal size={18} /></button>}</div><div className="ward-progress"><span style={{ width: `${ward.total_beds ? ward.occupied_beds / ward.total_beds * 100 : 0}%` }} /></div><div className="ward-bottom"><span><i /> {ward.available_beds} available</span><span>{ward.occupied_beds} occupied</span></div></article>)}</div> : <EmptyState icon={BedDouble} title="No ward inventory listed" body="The hospital has no ward bed counts available right now." />}
    <div className="inventory-disclaimer bed-disclaimer"><ShieldCheck size={15} /><span>{demo ? 'Aggregate sample counts are not a guarantee of admission or clinical suitability.' : 'Aggregate live counts are not a guarantee of admission or clinical suitability.'} Contact hospital staff to confirm current availability.</span></div>
    {admin && !demo && createKind && <AdminCreateModal kind={createKind} wardId={selectedWard} wards={liveWards} onClose={() => setCreateKind(null)} onSaved={() => { setRefresh((value) => value + 1); notify(createKind === 'ward' ? 'Ward created.' : 'Bed added.') }} />}
  </>
}

type AdminCreateKind = 'doctor' | 'department' | 'schedule' | 'ward' | 'bed' | 'blood' | 'blood-request'

function AdminCreateModal({ kind, doctorId, wardId, departments = [], wards = [], onClose, onSaved }: { kind: AdminCreateKind; doctorId?: string; wardId?: string; departments?: DepartmentRecord[]; wards?: BedAvailabilityRecord[]; onClose: () => void; onSaved: () => void }) {
  const { token } = useAuth()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const title: Record<AdminCreateKind, string> = { doctor: 'Add a doctor', department: 'Add a department', schedule: 'Add a clinic schedule', ward: 'Add a ward', bed: 'Add a bed', blood: 'Receive blood stock', 'blood-request': 'Create a blood request' }
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!token) { setError('Your session expired. Sign in again to continue.'); return }
    const values = new FormData(event.currentTarget)
    const value = (name: string) => String(values.get(name) ?? '').trim()
    setBusy(true)
    setError('')
    try {
      if (kind === 'doctor') {
        await createDoctor({ email: value('email'), password: value('password'), full_name: value('full_name'), specialization: value('specialization'), ...(value('department_id') ? { department_id: value('department_id') } : {}), ...(value('consultation_fee') ? { consultation_fee: Number(value('consultation_fee')) } : {}) }, token)
      } else if (kind === 'department') {
        await createDepartment({ name: value('name'), ...(value('location') ? { location: value('location') } : {}) }, token)
      } else if (kind === 'schedule') {
        if (!doctorId) throw new Error('Choose a doctor before adding a schedule.')
        await createDoctorSchedule(doctorId, { weekday: Number(value('weekday')), start_time: value('start_time'), end_time: value('end_time'), slot_minutes: Number(value('slot_minutes')) }, token)
      } else if (kind === 'ward') {
        await createWard({ name: value('name'), ward_type: value('ward_type') }, token)
      } else if (kind === 'bed') {
        await createBed(value('ward_id'), { bed_number: value('bed_number'), status: value('status') as BedStatus }, token)
      } else if (kind === 'blood') {
        await addBloodInventory({ blood_group: value('blood_group'), component: value('component') as BloodComponent, units: Number(value('units')), expires_on: value('expires_on'), tested: values.get('tested') === 'on' }, token)
      } else {
        await createBloodRequest({ blood_group: value('blood_group'), component: value('component') as BloodComponent, units: Number(value('units')), urgency: value('urgency') as BloodRequestRecord['urgency'], ...(value('reason') ? { reason: value('reason') } : {}) }, token)
      }
      onSaved()
      onClose()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save this record.')
    } finally {
      setBusy(false)
    }
  }
  const field = (label: string, name: string, type = 'text', props: InputHTMLAttributes<HTMLInputElement> = {}) => <label className="form-field" key={name}><span>{label}</span><input name={name} type={type} {...props} required={props.required ?? true} /></label>
  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}><section role="dialog" aria-modal="true" aria-labelledby="admin-create-title" className="booking-modal admin-create-modal"><div className="modal-top"><div><span className="eyebrow eyebrow-muted">HOSPITAL OPERATIONS</span><h2 id="admin-create-title">{title[kind]}</h2></div><button className="icon-button" aria-label="Close dialog" onClick={onClose}><X size={19} /></button></div><form className="booking-form" onSubmit={submit}>
    {kind === 'doctor' && <>{field('Full name', 'full_name')}{field('Work email', 'email', 'email')}{field('Temporary password', 'password', 'password', { minLength: 10, autoComplete: 'new-password' })}{field('Specialty', 'specialization')}{departments.length > 0 && <label className="form-field"><span>Department</span><select name="department_id" defaultValue=""><option value="">No department</option>{departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}</select></label>}{field('Consultation fee (optional)', 'consultation_fee', 'number', { min: 0, step: '0.01', required: false })}<p className="field-hint">A doctor login is created with this account. Add a schedule from the doctor list after saving.</p></>}
    {kind === 'department' && <>{field('Department name', 'name')}{field('Location (optional)', 'location', 'text', { required: false })}</>}
    {kind === 'schedule' && <><label className="form-field"><span>Clinic day</span><select name="weekday" defaultValue="0">{['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day, index) => <option key={day} value={index}>{day}</option>)}</select></label>{field('Starts at', 'start_time', 'time')}{field('Ends at', 'end_time', 'time')}<label className="form-field"><span>Appointment length</span><select name="slot_minutes" defaultValue="30">{[15, 20, 30, 45, 60].map((minutes) => <option key={minutes} value={minutes}>{minutes} minutes</option>)}</select></label><p className="field-hint">Uses Monday = 0 through Sunday = 6, as required by the hospital schedule.</p></>}
    {kind === 'ward' && <>{field('Ward name', 'name')}<label className="form-field"><span>Care type</span><select name="ward_type" defaultValue="general"><option value="general">General</option><option value="icu">ICU</option><option value="maternity">Maternity</option><option value="pediatrics">Pediatrics</option><option value="emergency">Emergency</option><option value="surgical">Surgical</option></select></label></>}
    {kind === 'bed' && <><label className="form-field"><span>Ward</span><select name="ward_id" defaultValue={wardId ?? wards[0]?.ward_id ?? ''} required>{wards.map((ward) => <option key={ward.ward_id} value={ward.ward_id}>{ward.ward}</option>)}</select></label>{field('Bed number', 'bed_number')}<label className="form-field"><span>Initial status</span><select name="status" defaultValue="available">{(['available', 'reserved', 'occupied', 'cleaning', 'maintenance'] as const).map((status) => <option key={status} value={status}>{status[0].toUpperCase() + status.slice(1)}</option>)}</select></label>{wards.length === 0 && <p className="field-hint">Create a ward before adding a bed.</p>}</>}
    {(kind === 'blood' || kind === 'blood-request') && <><label className="form-field"><span>Blood group</span><select name="blood_group" defaultValue="O+">{['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'].map((group) => <option key={group}>{group}</option>)}</select></label><label className="form-field"><span>Component</span><select name="component" defaultValue="red_cells">{[['red_cells', 'Red cells'], ['platelets', 'Platelets'], ['plasma', 'Plasma'], ['whole_blood', 'Whole blood']].map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>{field(kind === 'blood' ? 'Units received' : 'Units requested', 'units', 'number', { min: 1, max: 10000 })}{kind === 'blood' ? <>{field('Expiry date', 'expires_on', 'date', { min: localDateValue() })}<label className="checkbox-field"><input type="checkbox" name="tested" defaultChecked /> <span>Screening completed and tested</span></label><p className="field-hint">Only tested, unexpired stock appears in availability results.</p></> : <><label className="form-field"><span>Urgency</span><select name="urgency" defaultValue="routine"><option value="routine">Routine</option><option value="urgent">Urgent</option><option value="emergency">Emergency</option></select></label>{field('Reason or service area (optional)', 'reason', 'text', { required: false, maxLength: 500 })}<p className="field-hint">Requests are reviewed by an administrator. Fulfilling a request reduces eligible inventory.</p></>}</>}
    {error && <p className="field-error" role="alert">{error}</p>}<Button type="submit" className="full-width" disabled={busy || (kind === 'bed' && wards.length === 0)}>{busy ? 'Saving…' : 'Save record'} <ArrowRight size={15} /></Button></form></section></div>
}

function AdminDoctorsPage({ search, staff = false }: { search: string; staff?: boolean }) {
  const notify = useToast()
  const [doctors, setDoctors] = useState<DoctorRecord[]>([])
  const [departments, setDepartments] = useState<DepartmentRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refresh, setRefresh] = useState(0)
  const [modal, setModal] = useState<{ kind: 'doctor' | 'schedule'; doctorId?: string } | null>(null)
  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    Promise.all([listDoctors(), listDepartments()])
      .then(([doctorRows, departmentRows]) => { if (active) { setDoctors(doctorRows); setDepartments(departmentRows) } })
      .catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : 'Could not load the hospital directory.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [refresh])
  const rows = doctors.filter((doctor) => `${doctor.full_name} ${doctor.specialization}`.toLowerCase().includes(search.toLowerCase()))
  const title = staff ? 'Doctor staff accounts' : 'Doctors'
  const description = staff ? 'Doctor accounts currently supported by the staff service. Other staff roles need a backend endpoint.' : 'Manage the clinical directory and each doctor’s weekly clinic schedule.'
  return <>
    <div className="list-page-intro"><div><h1>{title}</h1><p>{description}</p></div><Button onClick={() => setModal({ kind: 'doctor' })}>Add doctor <Users size={15} /></Button></div>
    {error && <p className="field-error" role="alert">{error}</p>}
    {staff && <div className="inventory-disclaimer"><ShieldCheck size={15} /><span>This directory includes doctors only. Nurse, receptionist and other staff accounts are not supported by the current API.</span></div>}
    <section className="panel list-panel admin-directory-panel"><div className="list-toolbar"><div className="list-toolbar-info"><strong>{loading ? '…' : rows.length}</strong><span>· {loading ? 'Loading hospital directory' : 'Active doctor accounts'}</span></div><button className="export-button" onClick={() => setRefresh((value) => value + 1)}><Activity size={14} /> Refresh</button></div>
      {loading ? <EmptyState icon={Stethoscope} title="Loading doctors" body="Fetching the current hospital directory." /> : rows.length ? <div className="table-scroll"><table className="data-table"><thead><tr><th>Doctor</th><th>Specialty</th><th>Department</th><th>Consultation fee</th><th>Profile ID</th><th>Schedule</th></tr></thead><tbody>{rows.map((doctor) => { const department = departments.find((item) => item.id === doctor.department_id); return <tr key={doctor.id}><td><div className="person-cell"><span className="table-avatar">{userInitials(doctor.full_name.replace(/^Dr\.\s*/i, '').replaceAll(' ', '.') + '@medinex')}</span><span><strong>{doctor.full_name}</strong><small>Active directory listing</small></span></div></td><td>{doctor.specialization}</td><td>{department?.name ?? 'Not assigned'}</td><td>{doctor.consultation_fee ? `₹${Number(doctor.consultation_fee).toLocaleString('en-IN')}` : 'Not set'}</td><td className="table-code">DOC-{doctor.id.slice(0, 8).toUpperCase()}</td><td><button className="table-action" onClick={() => setModal({ kind: 'schedule', doctorId: doctor.id })}>Add schedule</button></td></tr> })}</tbody></table></div> : <EmptyState icon={Stethoscope} title={search ? 'No matching doctors' : 'No doctors in the directory'} body={search ? 'Try another name or specialty.' : 'Add a doctor account to begin building the hospital directory.'} />}
    </section>
    {modal && <AdminCreateModal kind={modal.kind} doctorId={modal.doctorId} departments={departments} onClose={() => setModal(null)} onSaved={() => { setRefresh((value) => value + 1); notify(modal.kind === 'doctor' ? 'Doctor account created.' : 'Clinic schedule added.') }} />}
  </>
}

function AdminDepartmentsPage({ search }: { search: string }) {
  const notify = useToast()
  const [departments, setDepartments] = useState<DepartmentRecord[]>([])
  const [doctors, setDoctors] = useState<DoctorRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refresh, setRefresh] = useState(0)
  const [createOpen, setCreateOpen] = useState(false)
  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    Promise.all([listDepartments(), listDoctors()])
      .then(([departmentRows, doctorRows]) => { if (active) { setDepartments(departmentRows); setDoctors(doctorRows) } })
      .catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : 'Could not load departments.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [refresh])
  const rows = departments.filter((department) => `${department.name} ${department.location ?? ''}`.toLowerCase().includes(search.toLowerCase()))
  return <>
    <div className="list-page-intro"><div><h1>Departments</h1><p>Organize hospital services and assign doctors to their care teams.</p></div><Button onClick={() => setCreateOpen(true)}>Add department <BriefcaseMedical size={15} /></Button></div>
    {error && <p className="field-error" role="alert">{error}</p>}
    <section className="panel list-panel admin-directory-panel"><div className="list-toolbar"><div className="list-toolbar-info"><strong>{loading ? '…' : rows.length}</strong><span>· {loading ? 'Loading departments' : 'Active departments'}</span></div><button className="export-button" onClick={() => setRefresh((value) => value + 1)}><Activity size={14} /> Refresh</button></div>
      {loading ? <EmptyState icon={BriefcaseMedical} title="Loading departments" body="Fetching hospital services and doctor assignments." /> : rows.length ? <div className="table-scroll"><table className="data-table"><thead><tr><th>Department</th><th>Location</th><th>Doctors</th><th>Reference</th><th>Status</th></tr></thead><tbody>{rows.map((department) => { const count = doctors.filter((doctor) => doctor.department_id === department.id).length; return <tr key={department.id}><td><strong>{department.name}</strong></td><td>{department.location || 'Not set'}</td><td>{count}</td><td className="table-code">DEP-{department.id.slice(0, 8).toUpperCase()}</td><td><StatusPill status="Active" /></td></tr> })}</tbody></table></div> : <EmptyState icon={BriefcaseMedical} title={search ? 'No matching departments' : 'No departments yet'} body={search ? 'Try another department or location.' : 'Create a department to organize the doctor directory.'} />}
    </section>
    {createOpen && <AdminCreateModal kind="department" onClose={() => setCreateOpen(false)} onSaved={() => { setRefresh((value) => value + 1); notify('Department created.') }} />}
  </>
}

function AdminPatientDirectoryPage({ search }: { search: string }) {
  const { token } = useAuth()
  const [patients, setPatients] = useState<PatientDirectoryRecord[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refresh, setRefresh] = useState(0)
  useEffect(() => {
    if (!token) return
    let active = true
    setLoading(true)
    setError('')
    listAdminPatients(search, token)
      .then((result) => { if (active) { setPatients(result.items); setTotal(result.total) } })
      .catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : 'Could not load patient records.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [search, token, refresh])
  return <>
    <div className="list-page-intro"><div><h1>Patient directory</h1><p>Restricted patient account details and appointment counts for hospital administrators.</p></div><button className="export-button" onClick={() => setRefresh((value) => value + 1)}><Activity size={14} /> Refresh</button></div>
    {error && <p className="field-error" role="alert">{error}</p>}
    <section className="panel list-panel admin-directory-panel"><div className="list-toolbar"><div className="list-toolbar-info"><strong>{loading ? '…' : total}</strong><span>· Patient accounts</span></div><span className="inventory-footnote">Search uses the workspace search above.</span></div>
      {loading ? <EmptyState icon={Users} title="Loading patient directory" body="Fetching records available to your administrator account." /> : patients.length ? <div className="table-scroll"><table className="data-table"><thead><tr><th>Patient</th><th>Contact</th><th>Appointments</th><th>Latest appointment</th><th>Account created</th></tr></thead><tbody>{patients.map((patient) => <tr key={patient.id}><td><div className="person-cell"><span className="table-avatar">{userInitials(patient.full_name.replaceAll(' ', '.') + '@medinex')}</span><span><strong>{patient.full_name}</strong><small className="table-code">PAT-{patient.id.slice(0, 8).toUpperCase()}</small></span></div></td><td><strong>{patient.email}</strong><small className="table-subline">{patient.phone || 'Phone not provided'}</small></td><td>{patient.appointment_count}</td><td>{patient.latest_appointment_at ? new Date(patient.latest_appointment_at).toLocaleDateString() : 'No appointments'}</td><td>{new Date(patient.created_at).toLocaleDateString()}</td></tr>)}</tbody></table></div> : <EmptyState icon={Users} title={search ? 'No matching patients' : 'No patient accounts yet'} body={search ? 'Try another name, email or phone number.' : 'Patient accounts will appear here after registration.'} />}
      {total > patients.length && <div className="table-pagination"><span>Showing {patients.length} of {total}. Refine search to find more.</span></div>}
    </section>
  </>
}

function AdminBloodRequestsPage({ search }: { search: string }) {
  const { token } = useAuth()
  const notify = useToast()
  const [requests, setRequests] = useState<BloodRequestRecord[]>([])
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState('')
  const [refresh, setRefresh] = useState(0)
  const [createOpen, setCreateOpen] = useState(false)
  useEffect(() => {
    if (!token) return
    let active = true
    setLoading(true)
    setError('')
    listBloodRequests(token, filter)
      .then((result) => { if (active) setRequests(result.items) })
      .catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : 'Could not load blood requests.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [filter, token, refresh])
  const rows = requests.filter((request) => `${request.patient_name ?? ''} ${request.requester_email ?? ''} ${request.blood_group} ${request.component} ${request.reason ?? ''}`.toLowerCase().includes(search.toLowerCase()))
  const transition = async (request: BloodRequestRecord, status: BloodRequestRecord['status']) => {
    if (!token) return
    setBusyId(request.id)
    try {
      await updateBloodRequest(request.id, status, token)
      setRefresh((value) => value + 1)
      notify(status === 'fulfilled' ? 'Request fulfilled and stock updated.' : `Request ${status}.`)
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Could not update the blood request.'
      setError(message)
      notify(message)
    } finally { setBusyId('') }
  }
  return <>
    <div className="list-page-intro"><div><h1>Blood requests</h1><p>Review requests and issue stock only when tested, unexpired inventory is available.</p></div><Button onClick={() => setCreateOpen(true)}>Create request <Droplets size={15} /></Button></div>
    {error && <p className="field-error" role="alert">{error}</p>}
    <section className="panel list-panel"><div className="list-toolbar"><div className="list-toolbar-info"><strong>{loading ? '…' : rows.length}</strong><span>· {filter === 'all' ? 'All blood requests' : `${filter} requests`}</span></div><label className="sort-select"><Filter size={14} /><select value={filter} onChange={(event) => setFilter(event.target.value)}><option value="all">All statuses</option><option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option><option value="fulfilled">Fulfilled</option></select><ChevronDown size={13} /></label></div>
      {loading ? <EmptyState icon={Droplets} title="Loading blood requests" body="Fetching the hospital request queue." /> : rows.length ? <div className="table-scroll"><table className="data-table"><thead><tr><th>Request</th><th>Patient / requester</th><th>Need</th><th>Urgency</th><th>Created</th><th>Status</th><th>Review</th></tr></thead><tbody>{rows.map((request) => <tr key={request.id}><td className="table-code">REQ-{request.id.slice(0, 8).toUpperCase()}<small className="table-subline">{request.reason || 'No reason supplied'}</small></td><td><strong>{request.patient_name || 'Hospital request'}</strong><small className="table-subline">{request.requester_email || 'Requester account unavailable'}</small></td><td>{request.units} × {request.blood_group} · {request.component.replaceAll('_', ' ')}</td><td><StatusPill status={request.urgency} /></td><td>{new Date(request.created_at).toLocaleString()}</td><td><StatusPill status={request.status} /></td><td>{request.status === 'pending' ? <span className="inline-actions"><button className="table-action" disabled={busyId === request.id} onClick={() => void transition(request, 'approved')}>Approve</button><button className="table-action table-action-danger" disabled={busyId === request.id} onClick={() => void transition(request, 'rejected')}>Reject</button></span> : request.status === 'approved' ? <button className="table-action" disabled={busyId === request.id} onClick={() => void transition(request, 'fulfilled')}>{busyId === request.id ? 'Updating…' : 'Fulfill'}</button> : <span className="table-action-muted">Closed</span>}</td></tr>)}</tbody></table></div> : <EmptyState icon={Droplets} title="No requests in this view" body={search ? 'Try a different search term.' : 'New blood requests will appear here when submitted.'} />}
    </section>
    {createOpen && <AdminCreateModal kind="blood-request" onClose={() => setCreateOpen(false)} onSaved={() => { setFilter('all'); setRefresh((value) => value + 1); notify('Blood request created.') }} />}
  </>
}

function AdminAuditLogsPage({ search }: { search: string }) {
  const { token } = useAuth()
  const [entries, setEntries] = useState<AuditLogRecord[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refresh, setRefresh] = useState(0)
  useEffect(() => {
    if (!token) return
    let active = true
    setLoading(true)
    setError('')
    listAuditLogs(token)
      .then((result) => { if (active) { setEntries(result.items); setTotal(result.total) } })
      .catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : 'Could not load audit history.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [token, refresh])
  const rows = entries.filter((entry) => `${entry.actor_email ?? ''} ${entry.actor_role ?? ''} ${entry.action} ${entry.resource_type} ${entry.resource_id ?? ''}`.toLowerCase().includes(search.toLowerCase()))
  return <>
    <div className="list-page-intro"><div><h1>Audit log</h1><p>Recent hospital actions, including who performed each change and which record it affected.</p></div><button className="export-button" onClick={() => setRefresh((value) => value + 1)}><Activity size={14} /> Refresh</button></div>
    {error && <p className="field-error" role="alert">{error}</p>}
    <section className="panel list-panel"><div className="list-toolbar"><div className="list-toolbar-info"><strong>{loading ? '…' : total}</strong><span>· Recorded actions</span></div><span className="inventory-footnote">Most recent 100 entries · administrators only</span></div>
      {loading ? <EmptyState icon={ShieldCheck} title="Loading audit history" body="Fetching recent hospital operations." /> : rows.length ? <div className="table-scroll"><table className="data-table"><thead><tr><th>Action</th><th>Actor</th><th>Resource</th><th>Record reference</th><th>Time</th></tr></thead><tbody>{rows.map((entry) => <tr key={entry.id}><td><strong>{entry.action.replaceAll('.', ' ')}</strong></td><td>{entry.actor_email || 'System / deleted account'}<small className="table-subline">{entry.actor_role || 'Unavailable'}</small></td><td>{entry.resource_type.replaceAll('_', ' ')}</td><td className="table-code">{entry.resource_id || '—'}</td><td>{new Date(entry.created_at).toLocaleString()}</td></tr>)}</tbody></table></div> : <EmptyState icon={ShieldCheck} title={search ? 'No matching audit entries' : 'No actions recorded yet'} body={search ? 'Try a different search term.' : 'Administrative and appointment actions will appear here.'} />}
    </section>
  </>
}

function AssistantPreview({ demo = false }: { demo?: boolean }) {
  const [messages, setMessages] = useState<{ from: 'assistant' | 'user'; text: string }[]>([
    { from: 'assistant', text: 'Hi. I can help you find hospital services and answer questions using available hospital information. I can’t diagnose or prescribe.' },
  ])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const { token } = useAuth()
  const send = async (event: FormEvent) => {
    event.preventDefault()
    const userText = input.trim()
    if (!userText || sending) return
    setInput('')
    setMessages((current) => [...current, { from: 'user', text: userText }, { from: 'assistant', text: 'Thinking…' }])
    if (demo || !token) {
      setMessages((current) => [...current.slice(0, -1), { from: 'assistant', text: 'This is a demo workspace. Sign in to use the live assistant; its hospital data and Gemini service must be configured by the administrator.' }])
      return
    }
    setSending(true)
    try {
      const response = await askAssistant(userText, token)
      setMessages((current) => [...current.slice(0, -1), { from: 'assistant', text: response.reply }])
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'The assistant is unavailable right now.'
      setMessages((current) => [...current.slice(0, -1), { from: 'assistant', text: message }])
    } finally {
      setSending(false)
    }
  }
  return <div className="assistant-layout"><div className="assistant-intro panel"><div className="assistant-emblem"><Sparkles size={21} /></div><div className="eyebrow eyebrow-muted">MEDINEX AI · {demo ? 'PREVIEW' : 'ASSISTANT'}</div><h2>Here to help you<br />find your next step.</h2><p>A multilingual assistant designed to help people navigate appointments, hospital services and common questions.</p><div className="assistant-capabilities"><span><CheckCircle2 size={15} /> English, Hindi & Hinglish</span><span><CheckCircle2 size={15} /> Appointment guidance</span><span><CheckCircle2 size={15} /> Clear handoff to care teams</span></div><div className="assistant-safety"><ShieldCheck size={16} /><p>Not for diagnosis or medical advice. For urgent symptoms, contact local emergency services or your care team.</p></div></div><section className="chat-panel panel"><div className="chat-header"><div><span className="chat-avatar"><Sparkles size={16} /></span><span><strong>Medinex assistant</strong><small><i /> {demo ? 'Demo mode' : 'Connected to Medinex API'}</small></span></div><button className="icon-link" aria-label="Conversation information"><CircleHelp size={17} /></button></div><div className="chat-transcript" aria-live="polite">{messages.map((message, index) => <div className={`chat-message message-${message.from}`} key={index}><span className="chat-message-icon">{message.from === 'assistant' ? <Sparkles size={14} /> : 'M'}</span><p>{message.text}</p></div>)}</div><div className="suggested-prompts"><span>TRY ASKING</span><button type="button" onClick={() => setInput('Find a cardiologist')}>Find a cardiologist</button><button type="button" onClick={() => setInput('Are ICU beds available?')}>Check bed availability</button></div><form className="chat-compose" onSubmit={send}><input aria-label="Message the Medinex assistant" value={input} onChange={(event) => setInput(event.target.value)} placeholder="Ask about appointments or services…" disabled={sending} /><button aria-label="Send message" type="submit" disabled={sending || !input.trim()}><Send size={16} /></button></form><p className="chat-disclaimer">Replies use the hospital assistant service when configured. Do not share unnecessary medical identifiers.</p></section></div>
}

type ListRow = { name: string; detail: string; date: string; status: string; ref: string; id?: string }

function GeneralListPage({ page, role, search }: { page: string; role: PortalRole; search: string }) {
  const [filter, setFilter] = useState('All statuses')
  const [liveRows, setLiveRows] = useState<ListRow[]>([])
  const [loadingLiveRows, setLoadingLiveRows] = useState(false)
  const [liveRowsError, setLiveRowsError] = useState('')
  const [canceling, setCanceling] = useState('')
  const { token } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const notify = useToast()
  const demo = location.pathname.startsWith('/demo/')
  const liveDoctorPatients = !demo && role === 'doctor' && page === 'patients'
  const liveRecordsPage = !demo && (page === 'appointments' || role === 'doctor' && (page === 'schedule' || page === 'patients'))
  useEffect(() => {
    if (!liveRecordsPage || !token) return
    let active = true
    setLoadingLiveRows(true)
    setLiveRowsError('')
    Promise.all([listMyAppointments(token), listDoctors()])
      .then(([appointments, doctors]) => {
        if (!active) return
        if (liveDoctorPatients) {
          const patients = new Map<string, AppointmentRecord[]>()
          appointments.forEach((appointment) => patients.set(appointment.patient_id, [...(patients.get(appointment.patient_id) ?? []), appointment]))
          setLiveRows([...patients.entries()].map(([patientId, visits]) => ({
            name: `Patient ${patientId.slice(0, 8).toUpperCase()}`,
            detail: `${visits.length} appointment${visits.length === 1 ? '' : 's'} in your care schedule`,
            date: new Date(Math.max(...visits.map((item) => new Date(item.start_at).getTime()))).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' }),
            status: 'Linked to your schedule',
            ref: `PAT-${patientId.slice(0, 8).toUpperCase()}`,
          })))
          return
        }
        setLiveRows(appointments.map((appointment) => {
          const doctor = doctors.find((item) => item.id === appointment.doctor_id)
          const isPatient = role === 'patient'
          return {
            id: appointment.id,
            name: isPatient ? doctor?.full_name ?? 'Hospital doctor' : `Patient ${appointment.patient_id.slice(0, 8).toUpperCase()}`,
            detail: isPatient ? doctor?.specialization ?? 'Specialty not listed' : doctor ? `${doctor.full_name} · ${doctor.specialization}` : 'Hospital appointment',
            date: `${new Date(appointment.start_at).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })}, ${formatSlotTime(appointment.start_at)}`,
            status: appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1),
            ref: `APT-${appointment.id.slice(0, 8).toUpperCase()}`,
          }
        }))
      })
      .catch((cause) => { if (active) setLiveRowsError(cause instanceof Error ? cause.message : 'Could not load your appointments.') })
      .finally(() => { if (active) setLoadingLiveRows(false) })
    return () => { active = false }
  }, [liveRecordsPage, liveDoctorPatients, role, token])
  const demoRows: ListRow[] = page === 'appointments' || page === 'schedule' ? demoAppointments.map((item) => ({ name: item.patient, detail: item.specialty, date: item.date, status: item.status, ref: item.code }))
    : page === 'doctors' ? demoDoctors.map((item) => ({ name: item.name, detail: item.specialty, date: item.availability, status: 'Available', ref: item.location }))
    : page === 'patients' ? demoAppointments.map((item, index) => ({ name: item.patient, detail: ['Patient · ID 1092', 'Patient · ID 1093', 'Patient · ID 1094', 'Patient · ID 1095', 'Patient · ID 1096'][index], date: item.date, status: index === 1 ? 'Follow-up' : 'Active', ref: item.code }))
    : page === 'blood-requests' ? [{ name: 'BR-3102 · O−', detail: 'Emergency department', date: 'Today, 9:42 AM', status: 'Under review', ref: 'Urgent' }, { name: 'BR-3101 · A+', detail: 'Maternity ward', date: 'Today, 8:10 AM', status: 'Approved', ref: 'Routine' }, { name: 'BR-3100 · B−', detail: 'Surgical services', date: 'Yesterday, 4:18 PM', status: 'Pending', ref: 'Routine' }]
    : page === 'departments' ? ['Cardiology', 'Neurology', 'Pediatrics', 'Orthopedics', 'Dermatology'].map((name, index) => ({ name, detail: `${[8, 5, 7, 4, 3][index]} doctors · Sample`, date: `${[16, 12, 20, 9, 8][index]} visits today`, status: 'Active', ref: `DEP-00${index + 1}` }))
    : page === 'staff' ? ['Dr. Ananya Rao', 'Maya Fernandes', 'Dr. Priya Nair', 'Ritesh Sharma'].map((name, index) => ({ name, detail: ['Doctor · Cardiology', 'Hospital staff · Admissions', 'Doctor · Cardiology', 'Hospital staff · Operations'][index], date: 'On shift', status: 'Active', ref: `STF-10${index + 1}` }))
    : page === 'audit-logs' ? [{ name: 'Appointment confirmed', detail: 'Care team · Cardiology', date: '10:32 AM', status: 'Complete', ref: 'ACT-0082' }, { name: 'Inventory reviewed', detail: 'Hospital staff', date: '10:05 AM', status: 'Complete', ref: 'ACT-0081' }, { name: 'Bed status updated', detail: 'Admissions · General', date: '9:40 AM', status: 'Complete', ref: 'ACT-0080' }]
    : []
  const rows = demo ? demoRows : liveRecordsPage ? liveRows : []
  const filtered = rows.filter((row) => `${row.name} ${row.detail} ${row.ref}`.toLowerCase().includes(search.toLowerCase()) && (filter === 'All statuses' || row.status === filter))
  const title = routeTitles[page]?.title ?? 'Workspace'
  const description = routeTitles[page]?.subtitle ?? ''
  const availableFilters = ['All statuses', ...new Set(rows.map((item) => item.status))]
  const actionLabel = page === 'appointments' && role === 'patient' ? 'Book appointment' : undefined
  const cancel = async (row: ListRow) => {
    if (!row.id || !token || !window.confirm('Cancel this appointment?')) return
    setCanceling(row.id)
    try {
      const updated = await cancelAppointment(row.id, token)
      setLiveRows((current) => current.map((item) => item.id === row.id ? { ...item, status: updated.status.charAt(0).toUpperCase() + updated.status.slice(1) } : item))
      notify('Appointment cancelled.')
    } catch (cause) {
      setLiveRowsError(cause instanceof Error ? cause.message : 'Could not cancel this appointment.')
    } finally { setCanceling('') }
  }
  return <><div className="list-page-intro"><div><h1>{title}</h1><p>{description}</p></div>{actionLabel && <Button onClick={() => navigate(demo ? '/demo/patient/doctors' : '/patient/doctors')}>{actionLabel} <ArrowRight size={15} /></Button>}</div>{liveRowsError && <p className="field-error" role="alert">{liveRowsError}</p>}<div className="panel list-panel"><div className="list-toolbar"><div className="list-toolbar-info"><strong>{loadingLiveRows ? '…' : rows.length} {rows.length === 1 ? 'record' : 'records'}</strong><span>· {demo ? 'Sample data' : liveRecordsPage ? 'Live appointment data' : 'Service not connected'}</span></div><label className="sort-select"><Filter size={14} /><select value={filter} onChange={(event) => setFilter(event.target.value)}>{availableFilters.map((option) => <option key={option}>{option}</option>)}</select><ChevronDown size={13} /></label><button className="export-button" disabled title="Export will be available when the reporting endpoint is connected"><FileDown size={15} /> Export</button></div>{loadingLiveRows ? <EmptyState icon={CalendarDays} title="Loading hospital records" body="Fetching appointments linked to your account." /> : filtered.length ? <div className="table-scroll"><table className="data-table"><thead><tr><th>{role === 'patient' ? 'Doctor' : 'Patient record'}</th><th>Details</th><th>{liveDoctorPatients ? 'Latest appointment' : 'Date & time'}</th><th>Status</th><th>Reference</th><th>Action</th></tr></thead><tbody>{filtered.map((row) => <tr key={row.ref}><td><div className="person-cell"><span className="table-avatar">{row.name.split(' ').map((part) => part[0]).join('').slice(0, 2)}</span><span><strong>{row.name}</strong><small>{demo ? role === 'admin' ? 'Sample workspace' : 'Sample care workspace' : liveDoctorPatients ? 'Identified by account ID' : 'Hospital record'}</small></span></div></td><td>{row.detail}</td><td>{row.date}</td><td><StatusPill status={row.status} /></td><td className="table-code">{row.ref}</td><td>{row.id && !['Cancelled', 'Completed'].includes(row.status) ? <button className="table-action" disabled={canceling === row.id} onClick={() => void cancel(row)}>{canceling === row.id ? 'Cancelling…' : 'Cancel'}</button> : demo ? <span className="table-action-muted">Preview</span> : <span className="table-action-muted">—</span>}</td></tr>)}</tbody></table></div> : <EmptyState icon={liveDoctorPatients ? Users : Search} title={demo ? 'No records found' : liveDoctorPatients ? 'No patient appointments yet' : 'No appointments yet'} body={demo ? 'Adjust your search or status filter and try again.' : liveRowsError ? 'Resolve the service message above and refresh the page.' : liveRecordsPage ? 'Booked appointments will appear here as the backend returns them.' : 'This authenticated workspace has no endpoint for this list yet.'} />}<div className="table-pagination"><span>Showing {filtered.length} of {rows.length} {liveRecordsPage ? 'hospital records' : 'sample records'}</span><span><button aria-label="Previous page" disabled><ChevronLeft size={16} /></button><b>1</b><button aria-label="Next page" disabled><ChevronRight size={16} /></button></span></div></div></>
}

function ProfilePage({ role, demo = false, user }: { role: PortalRole; demo?: boolean; user: ReturnType<typeof useAuth>['user'] }) {
  const notify = useToast()
  const roleName = role === 'patient' ? 'Patient' : role === 'doctor' ? 'Doctor' : 'Hospital administrator'
  if (!demo) return <div className="profile-layout"><section className="panel profile-card"><span className="profile-avatar">{userInitials(user?.email)}</span><h2>{user?.email ?? 'Signed-in account'}</h2><p>{roleName} · Medinex workspace</p><StatusPill status={user?.is_active ? 'Active account' : 'Inactive account'} /><span className="profile-readonly-note">Account profile is read-only in this frontend.</span></section><section className="panel profile-details"><SectionTitle title="Account information" /><div className="profile-fields"><label>Email address<span>{user?.email ?? 'Unavailable'}</span></label><label>Account type<span>{roleName}</span></label><label>Account ID<span className="table-code">{user?.id ?? 'Unavailable'}</span></label><label>Account status<span>{user?.is_active ? 'Active' : 'Inactive'}</span></label></div><div className="profile-privacy"><ShieldCheck size={16} /><span>The current account endpoint does not expose personal profile details such as name or phone.</span></div></section></div>
  return <div className="profile-layout"><section className="panel profile-card"><span className="profile-avatar">{demo ? (role === 'patient' ? 'MF' : role === 'doctor' ? 'AR' : 'AM') : userInitials(user?.email)}</span><h2>{role === 'patient' ? 'Maya Fernandes' : role === 'doctor' ? 'Dr. Ananya Rao' : 'Alex Morgan'}</h2><p>{roleName} · Medinex demo workspace</p><StatusPill status="Demo account" /><button className="button button-secondary" onClick={() => notify('Profile editing will be available when secure account services are connected.')}>Edit profile <ArrowRight size={15} /></button></section><section className="panel profile-details"><SectionTitle title="Personal information" /><div className="profile-fields"><label>Full name<span>{role === 'patient' ? 'Maya Fernandes' : role === 'doctor' ? 'Dr. Ananya Rao' : 'Alex Morgan'}</span></label><label>Email address<span>maya@example.com</span></label><label>Phone number<span>Not provided</span></label><label>Account type<span>{roleName}</span></label></div><div className="profile-privacy"><ShieldCheck size={16} /><span>Profile values are sample information in this frontend preview.</span></div></section></div>
}

function SettingsPage({ role, demo = false }: { role: PortalRole; demo?: boolean }) {
  const storageKey = `medinex.preferences.${demo ? 'demo' : role}`
  const [enabled, setEnabled] = useState<Record<string, boolean>>(() => {
    try { return { appointments: true, inventory: true, weekly: false, ...JSON.parse(window.localStorage.getItem(storageKey) ?? '{}') as Record<string, boolean> } }
    catch { return { appointments: true, inventory: true, weekly: false } }
  })
  const [saved, setSaved] = useState(false)
  const notify = useToast()
  const settings = [['appointments', 'Appointment reminders', 'In-app updates for changes and upcoming visits.'], ['inventory', 'Operational alerts', 'Notify authorized staff when demo stock requires attention.'], ['weekly', 'Weekly activity summary', 'A weekly digest of workspace activity.']]
  const save = () => { window.localStorage.setItem(storageKey, JSON.stringify(enabled)); setSaved(true); notify('Preferences saved in this browser. They are not synced to hospital settings.') }
  return <div className="settings-layout"><section className="panel settings-card"><SectionTitle title="Notifications" /><p>Choose the updates you would like to enable for this browser.</p>{settings.map(([id, title, description]) => <div className="setting-row" key={id}><div><strong>{title}</strong><span>{description}</span></div><button role="switch" aria-checked={enabled[id]} className={`switch ${enabled[id] ? 'on' : ''}`} aria-label={title} onClick={() => { setEnabled((state) => ({ ...state, [id]: !state[id] })); setSaved(false) }}><i /></button></div>)}</section><section className="panel settings-card"><SectionTitle title="Workspace preferences" /><div className="setting-row"><div><strong>Hospital timezone</strong><span>Times follow your browser until the hospital sets a timezone.</span></div><span className="pref-value">{demo ? 'Asia/Kolkata · preview' : Intl.DateTimeFormat().resolvedOptions().timeZone}</span></div><div className="setting-row"><div><strong>Data environment</strong><span>{demo ? 'Synthetic preview content.' : 'Authenticated hospital workspace.'}</span></div><span className="demo-pill"><span /> {demo ? 'SAMPLE DATA' : 'ACCOUNT ACCESS'}</span></div><Button variant="secondary" onClick={save}>{saved ? 'Saved' : 'Save preferences'} <Check size={15} /></Button></section></div>
}

function NotificationsPage({ demo = false, onUnreadChange }: { demo?: boolean; onUnreadChange?: (count: number) => void }) {
  const [read, setRead] = useState(false)
  const [liveItems, setLiveItems] = useState<NotificationRecord[]>([])
  const [loading, setLoading] = useState(!demo)
  const [error, setError] = useState('')
  const { token } = useAuth()
  const notify = useToast()
  const items: { title: string; text: string; time: string; icon: LucideIcon }[] = [
    { title: 'Appointment confirmed', text: 'Your visit with Dr. Priya Nair is confirmed for today at 3:30 PM.', time: '10 min ago', icon: CalendarDays },
    { title: 'Reminder · Tomorrow', text: 'You have an upcoming visit with Dr. Arjun Mehta at 10:00 AM.', time: 'Yesterday', icon: Bell },
    { title: 'Profile update', text: 'Your care team information was refreshed.', time: '12 Oct 2026', icon: Users },
  ]
  useEffect(() => {
    if (demo || !token) return
    let active = true
    setLoading(true)
    setError('')
    listNotifications(token)
      .then((notifications) => { if (active) { setLiveItems(notifications); onUnreadChange?.(notifications.filter((item) => !item.is_read).length) } })
      .catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : 'Could not load your notifications.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [demo, token, onUnreadChange])
  const markAllRead = async () => {
    if (demo) { setRead(true); return }
    if (!token) return
    try {
      await markAllNotificationsRead(token)
      setLiveItems((current) => current.map((item) => ({ ...item, is_read: true })))
      onUnreadChange?.(0)
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Could not update notifications.'
      setError(message)
      notify(message)
    }
  }
  const markRead = async (item: NotificationRecord) => {
    if (!token || item.is_read) return
    try {
      await markNotificationRead(item.id, token)
      setLiveItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, is_read: true } : entry))
      onUnreadChange?.(Math.max(0, liveItems.filter((entry) => !entry.is_read).length - 1))
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Could not update this notification.'
      setError(message)
      notify(message)
    }
  }
  if (demo) return <section className="panel notifications-panel"><SectionTitle title="Recent sample updates" action={<button className="text-link small-link" onClick={() => void markAllRead()}>Mark all as read <Check size={14} /></button>} />{items.map(({ title, text, time, icon: Icon }, index) => <article className={`notification-row ${index === 0 && !read ? 'notification-unread' : ''}`} key={title}><span className="notification-icon"><Icon size={17} /></span><div><strong>{title}</strong><p>{text}</p><small>{time}</small></div>{index === 0 && !read && <i className="notification-dot" />}</article>)}</section>
  return <section className="panel notifications-panel"><SectionTitle title="Recent updates" action={liveItems.some((item) => !item.is_read) ? <button className="text-link small-link" onClick={() => void markAllRead()}>Mark all as read <Check size={14} /></button> : undefined} />{error && <p className="field-error" role="alert">{error}</p>}{loading ? <EmptyState icon={Bell} title="Loading notifications" body="Fetching updates for your account." /> : liveItems.length ? liveItems.map((item) => { const Icon = item.category === 'appointment' ? CalendarDays : item.category === 'blood_request' ? Droplets : Bell; return <article className={`notification-row ${!item.is_read ? 'notification-unread' : ''}`} key={item.id}><span className="notification-icon"><Icon size={17} /></span><div><strong>{item.title}</strong><p>{item.message}</p><small>{new Date(item.created_at).toLocaleString()}</small></div>{!item.is_read && <button className="text-link small-link notification-mark-read" onClick={() => void markRead(item)}>Mark read</button>}</article> }) : <EmptyState icon={Bell} title="No notifications yet" body="Appointment confirmations and request updates will appear here." />}</section>
}

function ReportsPage({ demo = false, appointments = [], doctors = [] }: { demo?: boolean; appointments?: typeof demoAppointments; doctors?: DoctorRecord[] }) {
  if (!demo) return <><div className="report-kpis"><MetricCard label="Appointment records" value={String(appointments.length)} delta="Current hospital records" icon={CalendarDays} color="blue" /><MetricCard label="Doctor directory" value={String(doctors.length)} delta="Current active listings" icon={Stethoscope} color="purple" /><MetricCard label="Cancelled visits" value={String(appointments.filter((item) => item.status.toLowerCase() === 'cancelled').length)} delta="Current hospital records" icon={Activity} color="orange" /></div><section className="panel report-panel"><div className="report-title"><div><SectionTitle title="Operational reporting" /><p>Current counts from the appointment and doctor directory endpoints.</p></div></div><div className="service-placeholder report-service"><EmptyState icon={ChartNoAxesCombined} title="Trend reports are not connected yet" body="The backend does not provide historical analytics or admissions data. These totals are current records only, not a time series." /></div></section></>
  const kpis: { label: string; value: string; delta: string; icon: LucideIcon }[] = [
    { label: 'Appointments', value: '1,284', delta: '+8.2%', icon: CalendarDays },
    { label: 'Avg. wait time', value: '18 min', delta: '−4 min', icon: Clock3 },
    { label: 'Bed occupancy', value: '74%', delta: 'within range', icon: BedDouble },
  ]
  return <><div className="report-kpis">{kpis.map(({ label, value, delta, icon: Icon }) => <article className="metric-card" key={label}><div className="metric-top"><span>{label}</span><span className="metric-icon metric-blue"><Icon size={17} /></span></div><div className="metric-value">{value}</div><div className="metric-delta"><ArrowUpRight size={14} /><span>{delta}</span></div></article>)}</div><section className="panel report-panel"><div className="report-title"><div><SectionTitle title="Operational activity" /><p>Illustrative weekly totals for this demo workspace.</p></div><button className="export-button"><CalendarDays size={14} /> Last 7 days <ChevronDown size={13} /></button></div><div className="chart-area report-chart"><ActivityChart /></div><div className="inventory-disclaimer"><CircleHelp size={15} /> Demonstration values only. Connected database queries are required for verified reporting.</div></section></>
}

function PortalGate({ role }: { role: PortalRole }) {
  const { user, ready } = useAuth()
  if (!ready) return <main className="auth-layout"><section className="auth-main"><p className="auth-subtitle">Loading your secure workspace…</p></section></main>
  if (!user) return <Navigate to={role === 'admin' ? '/12admin/sign-in' : '/login'} replace />
  const destination = pathForRole(user.role)
  if (user.role !== role) return destination ? <Navigate to={destination} replace /> : <Navigate to={role === 'admin' ? '/12admin/sign-in' : '/login'} replace />
  return <PortalLayout role={role} />
}

function LegacyAdminRedirect() {
  const location = useLocation()
  return <Navigate to={`${location.pathname.replace(/^\/admin(?=\/|$)/, '/12admin')}${location.search}${location.hash}`} replace />
}

function PortalLayout({ role, demo = false }: { role: PortalRole; demo?: boolean }) {
  const location = useLocation()
  const pathParts = location.pathname.split('/').filter(Boolean)
  const page = pathParts[pathParts[0] === 'demo' ? 2 : 1] || 'dashboard'
  const navigate = useNavigate()
  const { user, token, signOut } = useAuth()
  const notify = useToast()
  const [menuOpen, setMenuOpen] = useState(false)
  const [dark, setDark] = useState(false)
  const [search, setSearch] = useState('')
  const [bookingOpen, setBookingOpen] = useState(false)
  const [selectedDoctor, setSelectedDoctor] = useState<string | undefined>()
  const [appointments, setAppointments] = useState<typeof demoAppointments>(demo ? demoAppointments : [])
  const [appointmentRecords, setAppointmentRecords] = useState<AppointmentRecord[]>([])
  const [liveDoctors, setLiveDoctors] = useState<DoctorRecord[]>([])
  const [doctorsLoading, setDoctorsLoading] = useState(!demo)
  const [doctorsError, setDoctorsError] = useState('')
  const [appointmentsLoading, setAppointmentsLoading] = useState(!demo)
  const [appointmentsError, setAppointmentsError] = useState('')
  const [unreadNotifications, setUnreadNotifications] = useState(demo ? 3 : 0)
  const nav = portalNavigation[role]
  const pageTitle = routeTitles[page]?.title ?? 'Workspace'
  const openBooking = (doctor?: string) => { setSelectedDoctor(doctor); setBookingOpen(true) }
  const portalRoot = demo ? `/demo/${role}` : role === 'admin' ? '/12admin' : `/${role}`
  const pathFor = (path: string) => demo ? path.replace(`/${role}/`, `${portalRoot}/`) : role === 'admin' ? path.replace(/^\/admin(?=\/|$)/, portalRoot) : path
  const activeRoute = pathFor(page === 'wards' || page === 'beds' ? '/admin/wards' : `/${role}/${page}`)
  const date = new Intl.DateTimeFormat('en', { weekday: 'short', month: 'short', day: 'numeric' }).format(new Date())
  useEffect(() => {
    if (demo) return
    let active = true
    setDoctorsLoading(true)
    setDoctorsError('')
    listDoctors()
      .then((items) => { if (active) setLiveDoctors(items) })
      .catch((cause) => { if (active) setDoctorsError(cause instanceof Error ? cause.message : 'Could not load the doctor directory.') })
      .finally(() => { if (active) setDoctorsLoading(false) })
    return () => { active = false }
  }, [demo, role])
  useEffect(() => {
    if (demo) {
      setAppointments(demoAppointments)
      setAppointmentRecords([])
      setAppointmentsLoading(false)
      return
    }
    setAppointments([])
    setAppointmentRecords([])
    setAppointmentsError('')
    if (!token || doctorsLoading) return
    let active = true
    setAppointmentsLoading(true)
    listMyAppointments(token)
      .then((rows) => { if (active) { setAppointmentRecords(rows); setAppointments(rows.map((row) => { const item = displayAppointment(row, liveDoctors); return role === 'patient' ? item : { ...item, patient: `Patient ${row.patient_id.slice(0, 8).toUpperCase()}` } })) } })
      .catch((cause) => { if (active) { const message = cause instanceof Error ? cause.message : 'Could not load your appointments.'; setAppointmentsError(message); notify(message) } })
      .finally(() => { if (active) setAppointmentsLoading(false) })
    return () => { active = false }
  }, [demo, role, token, doctorsLoading, liveDoctors])
  useEffect(() => {
    if (demo) { setUnreadNotifications(3); return }
    if (!token) { setUnreadNotifications(0); return }
    let active = true
    listNotifications(token)
      .then((items) => { if (active) setUnreadNotifications(items.filter((item) => !item.is_read).length) })
      .catch(() => { if (active) setUnreadNotifications(0) })
    return () => { active = false }
  }, [demo, token])
    return <div className={`portal-shell ${dark ? 'theme-dark' : ''}`}><aside className={`portal-sidebar ${menuOpen ? 'sidebar-open' : ''}`}><div className="sidebar-brand-row"><Brand /><button className="mobile-nav-toggle side-close" aria-label="Close navigation" onClick={() => setMenuOpen(false)}><X size={18} /></button></div><div className="workspace-select"><span className="workspace-avatar">{demo ? (role === 'patient' ? 'M' : role === 'doctor' ? 'C' : 'H') : userInitials(user?.email).slice(0, 1)}</span><span><strong>{demo ? (role === 'patient' ? 'Maya’s care' : role === 'doctor' ? 'Care team' : 'Meridian Hospital') : user?.email ?? 'Medinex workspace'}</strong><small>{roleLabels[role]}</small></span><ChevronDown size={14} /></div><div className="sidebar-label">WORKSPACE</div><nav className="sidebar-nav" aria-label="Workspace navigation">{nav.map((item, index) => <div key={item.path}>{item.group && <div className={`nav-group-label ${index ? 'nav-group-spaced' : ''}`}>{item.group}</div>}<NavLink onClick={() => setMenuOpen(false)} to={pathFor(item.path)} className={() => `sidebar-link ${activeRoute === pathFor(item.path) || (activeRoute === pathFor('/admin/wards') && page === 'beds') ? 'active' : ''}`}><item.icon size={17} /><span>{item.label}</span>{item.label === 'Notifications' && (demo ? <i className="nav-count">3</i> : unreadNotifications > 0 ? <i className="nav-count">{unreadNotifications}</i> : null)}</NavLink></div>)}</nav><div className="sidebar-bottom"><div className="help-card"><span><CircleHelp size={17} /></span><strong>Need a hand?</strong><small>Our team is here to help.</small><Link to="/contact">Get support <ArrowRight size={13} /></Link></div><div className="sidebar-user"><span className="user-avatar">{demo ? (role === 'patient' ? 'MF' : role === 'doctor' ? 'AR' : 'AM') : userInitials(user?.email)}</span><span><strong>{demo ? (role === 'patient' ? 'Maya Fernandes' : role === 'doctor' ? 'Dr. Ananya Rao' : 'Alex Morgan') : user?.email ?? 'Signed in'}</strong><small>{demo ? (role === 'patient' ? 'Patient' : role === 'doctor' ? 'Cardiologist' : 'Administrator') : roleLabels[role]}</small></span><button aria-label="Sign out" onClick={() => { signOut(); navigate(role === 'admin' ? '/12admin/sign-in' : '/login') }}><LogOut size={16} /></button></div></div></aside>
    {menuOpen && <button className="sidebar-scrim" aria-label="Close menu" onClick={() => setMenuOpen(false)} />}
    <div className="portal-main"><header className="portal-header"><button className="mobile-nav-toggle header-menu" aria-label="Open navigation" onClick={() => setMenuOpen(true)}><Menu size={20} /></button><div className="portal-breadcrumb"><Link to={pathFor(`/${role}/dashboard`)}>Workspace</Link><ChevronRight size={14} /><span>{page === 'dashboard' ? 'Overview' : pageTitle}</span></div><div className="portal-header-actions"><label className="portal-search"><Search size={16} /><input placeholder="Search this workspace…" value={search} onChange={(event) => setSearch(event.target.value)} aria-label="Search workspace" /><kbd>⌘ K</kbd></label><button className="theme-toggle" onClick={() => setDark(!dark)} aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'}>{dark ? <Sun size={17} /> : <Moon size={17} />}</button><button className="header-notification" aria-label="View notifications" onClick={() => navigate(pathFor(`/${role}/notifications`))}><Bell size={17} />{(demo || unreadNotifications > 0) && <i />}</button><span className="header-divider" /><span className="header-date">{date}</span><span className="header-avatar">{demo ? (role === 'patient' ? 'MF' : role === 'doctor' ? 'AR' : 'AM') : userInitials(user?.email)}</span></div></header>
      <main className="portal-content">
        {demo && <DemoBanner />}
        {!demo && appointmentsError && <p className="field-error" role="alert">{appointmentsError}</p>}
        {page === 'dashboard' ? <Dashboard role={role} appointments={appointments} appointmentRecords={appointmentRecords} doctors={liveDoctors} onBook={() => role === 'patient' ? openBooking() : navigate(pathFor(`/${role}/${role === 'doctor' ? 'schedule' : 'appointments'}`))} demo={demo} loadingAppointments={!demo && appointmentsLoading} unreadNotifications={unreadNotifications} user={user} routeFor={(target) => pathFor(`/${role}/${target}`)} />
          : role === 'patient' && page === 'doctors' ? <><div className="page-heading"><div><div className="eyebrow eyebrow-muted">YOUR CARE TEAM</div><h1>{routeTitles.doctors.title}</h1><p>{routeTitles.doctors.subtitle}</p></div><Button onClick={() => openBooking()}>Book an appointment <ArrowRight size={15} /></Button></div><DoctorDirectory onBook={openBooking} search={search} doctors={liveDoctors} loading={!demo && doctorsLoading} error={!demo ? doctorsError : ''} demo={demo} /></>
          : role === 'admin' && !demo && (page === 'doctors' || page === 'staff') ? <AdminDoctorsPage search={search} staff={page === 'staff'} />
          : role === 'admin' && !demo && page === 'departments' ? <AdminDepartmentsPage search={search} />
          : role === 'admin' && !demo && page === 'patients' ? <AdminPatientDirectoryPage search={search} />
          : role === 'admin' && !demo && page === 'blood-requests' ? <AdminBloodRequestsPage search={search} />
          : role === 'admin' && !demo && page === 'audit-logs' ? <AdminAuditLogsPage search={search} />
          : (role === 'patient' && page === 'appointments' || role === 'doctor' && ['appointments', 'schedule', 'patients'].includes(page) || role === 'admin' && page === 'appointments' || demo && role === 'admin' && ['appointments', 'doctors', 'patients', 'departments', 'blood-requests', 'staff', 'audit-logs'].includes(page)) ? <GeneralListPage role={role} page={page} search={search} />
          : (role === 'patient' && page === 'blood-availability' || role === 'admin' && page === 'blood-bank' || demo && role === 'admin' && page === 'blood-availability') ? <><div className="list-page-intro"><div><h1>{routeTitles[page].title}</h1><p>{routeTitles[page].subtitle}</p></div><span className="demo-pill"><span /> {demo ? 'SAMPLE INVENTORY' : 'LIVE INVENTORY'}</span></div><BloodAvailability admin={role === 'admin'} demo={demo} /></>
          : (role === 'patient' && page === 'bed-availability' || role === 'admin' && ['wards', 'beds'].includes(page) || demo && role === 'admin' && page === 'bed-availability') ? <><div className="list-page-intro"><div><h1>{page === 'bed-availability' ? routeTitles['bed-availability'].title : 'Wards & beds'}</h1><p>{routeTitles['bed-availability'].subtitle}</p></div></div><BedAvailability admin={role === 'admin'} demo={demo} /></>
          : role === 'patient' && page === 'ai-assistant' ? <><div className="page-heading"><div><div className="eyebrow eyebrow-muted">A LITTLE HELP, WHEN YOU NEED IT</div><h1>{routeTitles[page].title}</h1><p>{routeTitles[page].subtitle}</p></div><span className="demo-pill"><span /> {demo ? 'PREVIEW MODE' : 'AI SERVICE'}</span></div><AssistantPreview demo={demo} /></>
          : page === 'profile' ? <><div className="list-page-intro"><div><h1>{routeTitles[page].title}</h1><p>{routeTitles[page].subtitle}</p></div></div><ProfilePage role={role} demo={demo} user={user} /></>
          : page === 'notifications' ? <><div className="list-page-intro"><div><h1>{routeTitles[page].title}</h1><p>{routeTitles[page].subtitle}</p></div><span className="demo-pill"><span /> {demo ? 'SAMPLE UPDATES' : 'LIVE UPDATES'}</span></div><NotificationsPage demo={demo} onUnreadChange={setUnreadNotifications} /></>
          : role === 'admin' && page === 'settings' ? <><div className="list-page-intro"><div><h1>{routeTitles[page].title}</h1><p>{routeTitles[page].subtitle}</p></div></div><SettingsPage role={role} demo={demo} /></>
          : role === 'admin' && page === 'reports' ? <><div className="list-page-intro"><div><h1>{routeTitles[page].title}</h1><p>{demo ? routeTitles[page].subtitle : 'Current record counts from connected services.'}</p></div></div><ReportsPage demo={demo} appointments={appointments} doctors={liveDoctors} /></>
          : <Navigate to={pathFor(`/${role}/dashboard`)} replace />}
      </main>
    </div><BookModal open={bookingOpen} doctor={selectedDoctor} doctors={liveDoctors} demo={demo} onClose={() => setBookingOpen(false)} onBook={(appointment, record) => { setAppointments((existing) => [appointment, ...existing]); if (record) setAppointmentRecords((existing) => [record, ...existing]) }} />
  </div>
}

function App() {
  const [toast, setToast] = useState('')
  const dismiss = () => setToast('')
  const notify = (message: string) => setToast(message)
  return <AuthProvider><ToastContext.Provider value={notify}><Routes><Route path="/" element={<LandingPage />} /><Route path="/features" element={<InfoPage page="features" />} /><Route path="/about" element={<InfoPage page="about" />} /><Route path="/contact" element={<InfoPage page="contact" />} /><Route path="/login" element={<AuthPage kind="login" />} /><Route path="/register" element={<AuthPage kind="register" />} /><Route path="/forgot-password" element={<AuthPage kind="forgot" />} /><Route path="/12admin/sign-in" element={<AuthPage kind="login" adminOnly />} /><Route path="/12admin/forgot-password" element={<AuthPage kind="forgot" adminOnly />} /><Route path="/12admin/*" element={<PortalGate role="admin" />} /><Route path="/patient/*" element={<PortalGate role="patient" />} /><Route path="/doctor/*" element={<PortalGate role="doctor" />} /><Route path="/admin/*" element={<LegacyAdminRedirect />} /><Route path="/demo/patient/*" element={<PortalLayout role="patient" demo />} /><Route path="/demo/doctor/*" element={<PortalLayout role="doctor" demo />} /><Route path="/demo/admin/*" element={<PortalLayout role="admin" demo />} /><Route path="*" element={<Navigate to="/" replace />} /></Routes>{toast && <Toast message={toast} onDismiss={dismiss} />}</ToastContext.Provider></AuthProvider>
}

export default App
