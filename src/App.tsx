import { useEffect, useState, createContext, useContext, type ButtonHTMLAttributes, type FormEvent, type ReactNode } from 'react'
import { Link, NavLink, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router'
import { motion } from 'motion/react'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import type { UseFormRegisterReturn } from 'react-hook-form'
import {
  askAssistant, bookAppointment, getDoctorAvailability, listBedAvailability,
  listBloodAvailability, listDoctors, listMyAppointments, type AppointmentRecord,
  type BedAvailabilityRecord, type BloodAvailabilityRecord, type DoctorRecord, type DoctorSlot,
  type UserRole,
} from './api'
import { AuthProvider, useAuth } from './auth'
import {
  Activity, ArrowDownRight, ArrowRight, ArrowUpRight, BadgeCheck, BedDouble, Bell,
  CalendarDays, Check, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, CircleHelp,
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
  if (role === 'patient' || role === 'doctor' || role === 'admin') return `/${role}/dashboard`
  return null
}

function AuthField({ label, registration, error, type, placeholder, autoComplete }: { label: string; registration: UseFormRegisterReturn; error?: string; type: string; placeholder: string; autoComplete: string }) {
  return <label className="form-field"><span>{label}</span><input type={type} autoComplete={autoComplete} placeholder={placeholder} {...registration} />{error && <small className="field-error">{error}</small>}</label>
}

function AuthPage({ kind }: { kind: 'login' | 'register' | 'forgot' }) {
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const { signInUser, registerPatientUser, signOut } = useAuth()
  const navigate = useNavigate()
  const login = useForm<LoginValues>({ resolver: zodResolver(loginSchema) })
  const register = useForm<RegisterValues>({ resolver: zodResolver(registerSchema) })
  const forgot = useForm<{ email: string }>({ resolver: zodResolver(z.object({ email: z.email('Enter a valid email address.') })) })
  const title = kind === 'login' ? 'Welcome back' : kind === 'register' ? 'Create your account' : 'Reset your password'
  const subtitle = kind === 'login' ? 'Sign in to your Medinex workspace.' : kind === 'register' ? 'Create a secure patient account.' : 'Enter your email and we’ll help you get back in.'
  const finishSignIn = async (user: Awaited<ReturnType<typeof signInUser>>) => {
    const destination = pathForRole(user.role)
    if (!destination) {
      signOut()
      throw new Error('This account role is not available in the current workspace. Please contact your hospital administrator.')
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
  return <main className="auth-layout"><section className="auth-art"><div className="auth-art-glow" /><Brand inverse /><div className="auth-art-copy"><span className="eyebrow">A MORE HUMAN WAY TO MANAGE CARE</span><h1>Care moves<br />better <em>together.</em></h1><p>One thoughtful workspace for the people and details behind every visit.</p></div><div className="auth-art-foot"><ShieldCheck size={16} /> Built around clarity and privacy.</div></section><section className="auth-main"><div className="auth-mobile-brand"><Brand /></div><div className="auth-box"><Link to="/" className="back-link"><ChevronLeft size={15} /> Back to home</Link><div className="eyebrow eyebrow-muted">{kind === 'register' ? 'JOIN MEDINEX' : 'YOUR WORKSPACE'}</div><h2>{title}</h2><p className="auth-subtitle">{subtitle}</p>
    {kind === 'login' ? <form onSubmit={submitLogin} noValidate><AuthField label="Email address" type="email" placeholder="you@example.com" autoComplete="email" registration={login.register('email')} error={login.formState.errors.email?.message} /><AuthField label="Password" type="password" placeholder="At least 10 characters" autoComplete="current-password" registration={login.register('password')} error={login.formState.errors.password?.message} /><div className="auth-forgot"><Link to="/forgot-password">Forgot password?</Link></div><Button type="submit" className="auth-submit" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'} {!busy && <ArrowRight size={16} />}</Button></form> : kind === 'register' ? <form onSubmit={submitRegister} noValidate><AuthField label="Full name" type="text" placeholder="Your full name" autoComplete="name" registration={register.register('name')} error={register.formState.errors.name?.message} /><AuthField label="Email address" type="email" placeholder="you@example.com" autoComplete="email" registration={register.register('email')} error={register.formState.errors.email?.message} /><p className="field-hint">Patient accounts can sign up here. Doctors and staff accounts are provisioned by the hospital.</p><AuthField label="Password" type="password" placeholder="At least 10 characters" autoComplete="new-password" registration={register.register('password')} error={register.formState.errors.password?.message} /><Button type="submit" className="auth-submit" disabled={busy}>{busy ? 'Creating account…' : 'Create account'} {!busy && <ArrowRight size={16} />}</Button></form> : <form onSubmit={submitForgot} noValidate><AuthField label="Email address" type="email" placeholder="you@example.com" autoComplete="email" registration={forgot.register('email')} error={forgot.formState.errors.email?.message} /><Button type="submit" className="auth-submit">Continue <ArrowRight size={16} /></Button></form>}
    {error && <p className="field-error" role="alert">{error}</p>}
    <div className="auth-divider"><span>OR PREVIEW THE PRODUCT</span></div><Link to="/demo/patient/dashboard" className="demo-button"><LayoutGrid size={16} /> Explore demo workspace <ArrowRight size={15} /></Link><p className="auth-switch">{kind === 'login' ? <>New to Medinex? <Link to="/register">Create an account</Link></> : <>Already have an account? <Link to="/login">Sign in</Link></>}</p><p className="auth-legal"><ShieldCheck size={13} /> Workspace access follows your hospital account role.</p>
  </div><div className="auth-bottom"><span>© 2026 Medinex</span><Link to="/contact">Need help?</Link></div></section></main>
}

function DemoBanner() { return <div className="demo-banner"><span className="demo-banner-dot" /> DEMO WORKSPACE <span className="demo-banner-detail">All names, counts and activity shown are synthetic sample data.</span></div> }

function MetricCard({ label, value, delta, icon: Icon, color, trend }: { label: string; value: string; delta: string; icon: LucideIcon; color: string; trend?: 'up' | 'down' }) {
  return <article className="metric-card"><div className="metric-top"><span>{label}</span><span className={`metric-icon metric-${color}`}><Icon size={17} /></span></div><div className="metric-value">{value}</div><div className="metric-delta">{trend === 'down' ? <ArrowDownRight size={14} /> : <ArrowUpRight size={14} />}<span>{delta}</span></div></article>
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

function Dashboard({ role, appointments, onBook }: { role: PortalRole; appointments: typeof demoAppointments; onBook: () => void }) {
  const patient = role === 'patient'
  const doctor = role === 'doctor'
  const greeting = patient ? 'Welcome back, Maya' : doctor ? 'Good morning, Dr. Ananya' : 'Good morning, Alex'
  const description = patient ? 'Here’s what’s coming up in your care.' : doctor ? 'Here’s a look at your schedule and patient care today.' : 'Here’s a look at what’s happening across your hospital today.'
  const metrics = patient ? [
    { label: 'Upcoming visits', value: '2', delta: 'Next: today at 3:30 PM', icon: CalendarDays, color: 'blue' },
    { label: 'Care team', value: '4', delta: 'Across 3 specialties', icon: Stethoscope, color: 'purple' },
    { label: 'Notifications', value: '3', delta: '1 new reminder', icon: Bell, color: 'orange' },
    { label: 'Health records', value: '8', delta: 'Updated this month', icon: Heart, color: 'green' },
  ] : doctor ? [
    { label: 'Today’s visits', value: '12', delta: '4 remaining', icon: CalendarDays, color: 'blue' },
    { label: 'Patients seen', value: '08', delta: '+2 from yesterday', icon: Users, color: 'purple' },
    { label: 'Clinic hours', value: '6.5h', delta: 'Ends at 4:30 PM', icon: Clock3, color: 'green' },
    { label: 'Follow-ups', value: '03', delta: 'Need attention', icon: Activity, color: 'orange' },
  ] : demoMetrics
  const visits = patient ? appointments.slice(0, 2) : doctor ? appointments.slice(0, 4) : appointments.slice(0, 5)
  return <>
    <div className="page-heading"><div><div className="eyebrow eyebrow-muted">{new Intl.DateTimeFormat('en', { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date())}</div><h1>{greeting}</h1><p>{description}</p></div><Button onClick={onBook}><CalendarDays size={16} /> {patient ? 'Book an appointment' : doctor ? 'View schedule' : 'New appointment'} <ArrowRight size={15} /></Button></div>
    <div className="metrics-grid">{metrics.map((metric) => <MetricCard key={metric.label} {...metric} />)}</div>
    <div className="dashboard-main-grid"><section className="panel chart-panel"><SectionTitle title={patient ? 'Your care activity' : doctor ? 'Appointments this week' : 'Appointments this week'} action={<button className="select-ghost">This week <ChevronDown size={14} /></button>} /><div className="chart-legend"><span><i /> Appointments</span><span><i className="legend-soft" /> Admissions</span></div><div className="chart-area"><ActivityChart includeAdmissions /></div></section>
      <section className="panel capacity-panel"><SectionTitle title={patient ? 'Care at a glance' : 'Capacity at a glance'} action={<Link className="icon-link" to={role === 'patient' ? '/patient/bed-availability' : '/admin/wards'}><ArrowRight size={15} /></Link>} /><div className="capacity-total"><strong>74<span>%</span></strong><span>aggregate occupancy</span></div><div className="capacity-ring-wrap"><div className="capacity-ring"><div><strong>34</strong><span>available</span></div></div></div><div className="capacity-legend"><span><i className="cap-used" /> Occupied <b>90</b></span><span><i className="cap-free" /> Available <b>34</b></span></div><div className="capacity-caption"><span><LockKeyhole size={12} /> Aggregate demo count</span></div></section></div>
    <div className="dashboard-bottom-grid"><section className="panel appointments-panel"><SectionTitle title={patient ? 'Upcoming appointments' : doctor ? 'Today’s appointments' : 'Recent appointments'} action={<Link className="text-link small-link" to={`/${role}/appointments`}>View all <ArrowRight size={14} /></Link>} /><AppointmentTable appointments={visits} role={role} compact /></section><section className="panel activity-panel"><SectionTitle title={patient ? 'Your care team' : doctor ? 'Care notes' : 'Operational updates'} action={<button className="icon-link" aria-label="More activity"><MoreHorizontal size={17} /></button>} /><ActivityList role={role} /></section></div>
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

function BookModal({ open, doctor, doctors, demo, onClose, onBook }: { open: boolean; doctor?: string; doctors: DoctorRecord[]; demo: boolean; onClose: () => void; onBook: (appointment: typeof demoAppointments[number]) => void }) {
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
      onBook({ patient: 'You', doctor: doctorName, specialty: doctorSpecialty, date: `${new Date(appointment.start_at).toLocaleDateString('en', { month: 'short', day: 'numeric' })}, ${formatSlotTime(appointment.start_at)}`, status: appointment.status, code: `APT-${appointment.id.slice(0, 8).toUpperCase()}` })
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
  const [filter, setFilter] = useState('All groups')
  const [inventory, setInventory] = useState<BloodAvailabilityRecord[]>([])
  const [loading, setLoading] = useState(!demo)
  const [error, setError] = useState('')
  const [requested, setRequested] = useState('')
  const notify = useToast()

  useEffect(() => {
    if (demo) return
    let active = true
    setLoading(true)
    listBloodAvailability()
      .then((rows) => { if (active) setInventory(rows) })
      .catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : 'Could not load blood availability.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [demo])

  const groups = demo
    ? demoBlood.filter((item) => filter === 'All groups' || (filter === 'Low stock' ? item.status === 'Low stock' : item.status === 'Available'))
    : Object.values(inventory.reduce<Record<string, { group: string; units: number; status: string; tone: string }>>((all, item) => {
      const key = `${item.blood_group} · ${item.component}`
      const existing = all[key] ?? { group: key, units: 0, status: 'Available', tone: 'green' }
      existing.units += item.units_available
      all[key] = existing
      return all
    }, {}))
  const totalUnits = groups.reduce((sum, item) => sum + item.units, 0)
  const groupCount = demo ? groups.length : new Set(inventory.map((item) => item.blood_group)).size
  return <><div className="inventory-summary"><div className="inventory-highlight"><div className="inventory-highlight-icon"><Droplets size={20} /></div><div><span>{demo ? 'Total sample inventory' : 'Available inventory'}</span><strong>{totalUnits} <small>units</small></strong><p>{demo ? 'Illustrative counts across 8 blood groups' : `${groupCount} blood groups in hospital stock`}</p></div></div><div className="inventory-mini"><span>{demo ? 'Low stock groups' : 'Blood groups listed'}</span><strong>{demo ? <>3 <small>of 8</small></> : groupCount}</strong>{demo ? <StatusPill status="Attention" /> : <span className="inventory-footnote">Tested, unexpired stock only</span>}</div><div className="inventory-mini"><span>Open requests</span><strong>{demo && admin ? '7' : '—'}</strong><span className="inventory-footnote">{demo ? admin ? 'Sample operational count' : 'Ask hospital staff' : 'Request workflow not connected'}</span></div></div><div className="panel inventory-panel"><div className="panel-toolbar"><SectionTitle title="Inventory by blood group" action={<label className="sort-select"><Filter size={14} /><select value={filter} onChange={(event) => setFilter(event.target.value)}><option>All groups</option>{demo && <><option>Available</option><option>Low stock</option></>}</select><ChevronDown size={13} /></label>} /></div>{error && <p className="field-error" role="alert">{error}</p>}{loading ? <EmptyState icon={Droplets} title="Loading blood availability" body="Fetching the current hospital inventory." /> : groups.length ? <div className="blood-grid">{groups.map((item) => <article className={`blood-card ${item.tone === 'red' ? 'blood-low' : ''}`} key={item.group}><span className="blood-icon"><Droplets size={17} /></span><strong>{item.group}</strong><span className="blood-units"><b>{item.units}</b> {demo ? 'demo units' : 'units available'}</span><div className="blood-card-foot"><StatusPill status={item.status} />{demo && admin && <button className="table-action" onClick={() => { setRequested(item.group); notify(`Preview only: ${item.group} selected for follow-up.`) }}>Review</button>}</div></article>)}</div> : <EmptyState icon={Droplets} title="No inventory listed" body="The hospital has no available, tested stock in this category right now." />}<div className="inventory-disclaimer"><ShieldCheck size={15} /><span>{demo ? 'Sample inventory only. This is not verified live stock or clinical compatibility guidance.' : 'Counts are separated by blood group and component, and include only available, tested, unexpired inventory. Qualified hospital personnel must confirm any release decision.'}</span></div></div>{requested && <span className="sr-only" aria-live="polite">{requested} selected for review</span>}</>
}

function BedAvailability({ admin = false, demo = false }: { admin?: boolean; demo?: boolean }) {
  const [liveWards, setLiveWards] = useState<BedAvailabilityRecord[]>([])
  const [loading, setLoading] = useState(!demo)
  const [error, setError] = useState('')
  useEffect(() => {
    if (demo) return
    let active = true
    setLoading(true)
    listBedAvailability()
      .then((rows) => { if (active) setLiveWards(rows) })
      .catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : 'Could not load bed availability.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [demo])

  const wards = demo
    ? demoWards.map((ward) => ({ ward: ward.name, ward_type: ward.type, total_beds: ward.total, available_beds: ward.available, occupied_beds: ward.total - ward.available, color: ward.color }))
    : liveWards.map((ward, index) => ({ ward: ward.ward, ward_type: ward.ward_type, total_beds: ward.total_beds, available_beds: ward.available_beds, occupied_beds: ward.occupied_beds, color: ['teal', 'violet', 'pink', 'amber'][index % 4] }))
  const total = wards.reduce((sum, ward) => sum + ward.total_beds, 0)
  const available = wards.reduce((sum, ward) => sum + ward.available_beds, 0)
  const occupancy = total ? Math.round((total - available) / total * 100) : 0
  return <><div className="inventory-summary bed-summary"><div className="inventory-highlight"><div className="inventory-highlight-icon bed-highlight"><BedDouble size={20} /></div><div><span>Available across wards</span><strong>{available} <small>of {total}{demo ? ' demo' : ''} beds</small></strong><p>{demo ? 'Aggregate, illustrative availability' : 'Aggregate count from hospital inventory'}</p></div></div><div className="inventory-mini"><span>Occupancy</span><strong>{occupancy}<small>%</small></strong><div className="mini-progress"><i style={{ width: `${occupancy}%` }} /></div></div><div className="inventory-mini"><span>Last updated</span><strong>{demo ? '—' : loading ? '…' : 'Live'}</strong><span className="inventory-footnote">{demo ? admin ? 'Staff view · sample operations' : 'No live feed connected' : 'Hospital inventory service'}</span></div></div>{error && <p className="field-error" role="alert">{error}</p>}{loading ? <EmptyState icon={BedDouble} title="Loading bed availability" body="Fetching aggregate ward counts." /> : wards.length ? <div className="ward-grid">{wards.map((ward) => <article className="ward-card" key={ward.ward}><div className={`ward-illustration ward-${ward.color}`}><BedDouble size={24} /><span>{ward.ward_type}</span></div><div className="ward-title"><div><h3>{ward.ward}</h3><span>{ward.total_beds} total beds{demo ? ' · Demo' : ''}</span></div><button className="icon-link" aria-label={`More about ${ward.ward}`}><MoreHorizontal size={18} /></button></div><div className="ward-progress"><span style={{ width: `${ward.total_beds ? ward.occupied_beds / ward.total_beds * 100 : 0}%` }} /></div><div className="ward-bottom"><span><i /> {ward.available_beds} available</span><span>{ward.occupied_beds} occupied</span></div></article>)}</div> : <EmptyState icon={BedDouble} title="No ward inventory listed" body="The hospital has no ward bed counts available right now." />}<div className="inventory-disclaimer bed-disclaimer"><ShieldCheck size={15} /><span>{demo ? 'Aggregate sample counts are not a guarantee of admission or clinical suitability.' : 'Aggregate live counts are not a guarantee of admission or clinical suitability.'} Contact hospital staff to confirm current availability.</span></div></>
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

function GeneralListPage({ page, role, search }: { page: string; role: PortalRole; search: string }) {
  const [filter, setFilter] = useState('All statuses')
  const { token } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const livePatientAppointments = role === 'patient' && page === 'appointments' && !location.pathname.startsWith('/demo/')
  const [liveRows, setLiveRows] = useState<{ name: string; detail: string; date: string; status: string; ref: string }[]>([])
  const [loadingLiveRows, setLoadingLiveRows] = useState(false)
  const [liveRowsError, setLiveRowsError] = useState('')
  useEffect(() => {
    if (!livePatientAppointments || !token) return
    let active = true
    setLoadingLiveRows(true)
    setLiveRowsError('')
    Promise.all([listMyAppointments(token), listDoctors()])
      .then(([appointments, doctors]) => {
        if (!active) return
        setLiveRows(appointments.map((appointment) => {
          const doctor = doctors.find((item) => item.id === appointment.doctor_id)
          return {
            name: doctor?.full_name ?? 'Hospital doctor',
            detail: doctor?.specialization ?? 'Specialty not listed',
            date: `${new Date(appointment.start_at).toLocaleDateString('en', { month: 'short', day: 'numeric' })}, ${formatSlotTime(appointment.start_at)}`,
            status: appointment.status,
            ref: `APT-${appointment.id.slice(0, 8).toUpperCase()}`,
          }
        }))
      })
      .catch((cause) => { if (active) setLiveRowsError(cause instanceof Error ? cause.message : 'Could not load your appointments.') })
      .finally(() => { if (active) setLoadingLiveRows(false) })
    return () => { active = false }
  }, [livePatientAppointments, token])
  const demoRows = page === 'appointments' || page === 'schedule' ? demoAppointments.map((item) => ({ name: item.patient, detail: item.specialty, date: item.date, status: item.status, ref: item.code }))
    : page === 'doctors' ? demoDoctors.map((item) => ({ name: item.name, detail: item.specialty, date: item.availability, status: 'Available', ref: item.location }))
    : page === 'patients' ? demoAppointments.map((item, index) => ({ name: item.patient, detail: ['Patient · ID 1092', 'Patient · ID 1093', 'Patient · ID 1094', 'Patient · ID 1095', 'Patient · ID 1096'][index], date: item.date, status: index === 1 ? 'Follow-up' : 'Active', ref: item.code }))
    : page === 'blood-requests' ? [{ name: 'BR-3102 · O−', detail: 'Emergency department', date: 'Today, 9:42 AM', status: 'Under review', ref: 'Urgent' }, { name: 'BR-3101 · A+', detail: 'Maternity ward', date: 'Today, 8:10 AM', status: 'Approved', ref: 'Routine' }, { name: 'BR-3100 · B−', detail: 'Surgical services', date: 'Yesterday, 4:18 PM', status: 'Pending', ref: 'Routine' }]
    : page === 'departments' ? ['Cardiology', 'Neurology', 'Pediatrics', 'Orthopedics', 'Dermatology'].map((name, index) => ({ name, detail: `${[8, 5, 7, 4, 3][index]} doctors · Sample`, date: `${[16, 12, 20, 9, 8][index]} visits today`, status: 'Active', ref: `DEP-00${index + 1}` }))
    : page === 'staff' ? ['Dr. Ananya Rao', 'Maya Fernandes', 'Dr. Priya Nair', 'Ritesh Sharma'].map((name, index) => ({ name, detail: ['Doctor · Cardiology', 'Hospital staff · Admissions', 'Doctor · Cardiology', 'Hospital staff · Operations'][index], date: 'On shift', status: 'Active', ref: `STF-10${index + 1}` }))
    : page === 'audit-logs' ? [{ name: 'Appointment confirmed', detail: 'Care team · Cardiology', date: '10:32 AM', status: 'Complete', ref: 'ACT-0082' }, { name: 'Inventory reviewed', detail: 'Hospital staff', date: '10:05 AM', status: 'Complete', ref: 'ACT-0081' }, { name: 'Bed status updated', detail: 'Admissions · General', date: '9:40 AM', status: 'Complete', ref: 'ACT-0080' }]
    : []
  const rows = livePatientAppointments ? liveRows : demoRows
  const filtered = rows.filter((row) => `${row.name} ${row.detail} ${row.ref}`.toLowerCase().includes(search.toLowerCase()) && (filter === 'All statuses' || row.status === filter))
  const title = routeTitles[page]?.title ?? 'Workspace'
  const description = routeTitles[page]?.subtitle ?? ''
  const availableFilters = ['All statuses', ...new Set(rows.map((item) => item.status))]
  const notify = useToast()
  const actionLabel = livePatientAppointments ? 'Book appointment' : page === 'doctors' || page === 'staff' ? 'Add team member' : page === 'blood-requests' ? 'Create request' : page === 'departments' ? 'Add department' : undefined
  return <><div className="list-page-intro"><div><h1>{title}</h1><p>{description}</p></div>{actionLabel && <Button onClick={() => livePatientAppointments ? navigate('/patient/doctors') : notify('This action will be available when the connected hospital service is configured.')}><span>+</span>{actionLabel}</Button>}</div>{liveRowsError && <p className="field-error" role="alert">{liveRowsError}</p>}<div className="panel list-panel"><div className="list-toolbar"><div className="list-toolbar-info"><strong>{rows.length} {rows.length === 1 ? 'record' : 'records'}</strong><span>· {livePatientAppointments ? 'Live data' : 'Sample data'}</span></div><label className="sort-select"><Filter size={14} /><select value={filter} onChange={(event) => setFilter(event.target.value)}>{availableFilters.map((option) => <option key={option}>{option}</option>)}</select><ChevronDown size={13} /></label><button className="export-button" onClick={() => notify('Export is available after report permissions are connected.')}><FileDown size={15} /> Export</button></div>{loadingLiveRows ? <EmptyState icon={CalendarDays} title="Loading appointments" body="Fetching your hospital schedule." /> : filtered.length ? <div className="table-scroll"><table className="data-table"><thead><tr><th>{page === 'appointments' ? role === 'patient' ? 'Doctor' : 'Patient' : page === 'doctors' ? 'Doctor' : page === 'blood-requests' ? 'Request' : page === 'departments' ? 'Department' : page === 'audit-logs' ? 'Activity' : 'Name'}</th><th>Details</th><th>{page === 'appointments' ? 'Date & time' : 'Updated'}</th><th>Status</th><th>Reference</th><th /></tr></thead><tbody>{filtered.map((row) => <tr key={row.ref}><td><div className="person-cell"><span className="table-avatar">{row.name.split(' ').map((part) => part[0]).join('').slice(0, 2)}</span><span><strong>{row.name}</strong><small>{role === 'admin' ? 'Hospital workspace' : 'Your care workspace'}</small></span></div></td><td>{row.detail}</td><td>{row.date}</td><td><StatusPill status={row.status} /></td><td className="table-code">{row.ref}</td><td><button className="table-action" onClick={() => notify('Record details will be available through the connected hospital service.')}>Open</button></td></tr>)}</tbody></table></div> : <EmptyState icon={Search} title="No records found" body={livePatientAppointments ? 'No appointments are booked yet.' : 'Adjust your search or status filter and try again.'} />}<div className="table-pagination"><span>Showing {filtered.length} of {rows.length} {livePatientAppointments ? 'appointments' : 'sample records'}</span><span><button aria-label="Previous page" disabled><ChevronLeft size={16} /></button><b>1</b><button aria-label="Next page" disabled><ChevronRight size={16} /></button></span></div></div></>
}

function ProfilePage({ role }: { role: PortalRole }) {
  const notify = useToast()
  const roleName = role === 'patient' ? 'Patient' : role === 'doctor' ? 'Doctor' : 'Hospital administrator'
  return <div className="profile-layout"><section className="panel profile-card"><span className="profile-avatar">{role === 'patient' ? 'MF' : role === 'doctor' ? 'AR' : 'AM'}</span><h2>{role === 'patient' ? 'Maya Fernandes' : role === 'doctor' ? 'Dr. Ananya Rao' : 'Alex Morgan'}</h2><p>{roleName} · Medinex demo workspace</p><StatusPill status="Demo account" /><button className="button button-secondary" onClick={() => notify('Profile editing will be available when secure account services are connected.')}>Edit profile <ArrowRight size={15} /></button></section><section className="panel profile-details"><SectionTitle title="Personal information" /><div className="profile-fields"><label>Full name<span>{role === 'patient' ? 'Maya Fernandes' : role === 'doctor' ? 'Dr. Ananya Rao' : 'Alex Morgan'}</span></label><label>Email address<span>maya@example.com</span></label><label>Phone number<span>Not provided</span></label><label>Account type<span>{roleName}</span></label></div><div className="profile-privacy"><ShieldCheck size={16} /><span>Profile values are sample information in this frontend preview.</span></div></section></div>
}

function SettingsPage() {
  const [enabled, setEnabled] = useState<Record<string, boolean>>({ appointments: true, inventory: true, weekly: false })
  const notify = useToast()
  const settings = [['appointments', 'Appointment reminders', 'In-app updates for changes and upcoming visits.'], ['inventory', 'Operational alerts', 'Notify authorized staff when demo stock requires attention.'], ['weekly', 'Weekly activity summary', 'A weekly digest of workspace activity.']]
  return <div className="settings-layout"><section className="panel settings-card"><SectionTitle title="Notifications" /><p>Choose the updates you would like to preview in this workspace.</p>{settings.map(([id, title, description]) => <div className="setting-row" key={id}><div><strong>{title}</strong><span>{description}</span></div><button role="switch" aria-checked={enabled[id]} className={`switch ${enabled[id] ? 'on' : ''}`} aria-label={title} onClick={() => setEnabled((state) => ({ ...state, [id]: !state[id] }))}><i /></button></div>)}</section><section className="panel settings-card"><SectionTitle title="Workspace preferences" /><div className="setting-row"><div><strong>Hospital timezone</strong><span>Dates and times shown in your local preview.</span></div><span className="pref-value">Asia/Kolkata</span></div><div className="setting-row"><div><strong>Data environment</strong><span>Current source for visible dashboard content.</span></div><span className="demo-pill"><span /> SAMPLE DATA</span></div><Button variant="secondary" onClick={() => notify('These preferences are kept for this preview only.')}>Save preferences <Check size={15} /></Button></section></div>
}

function NotificationsPage() {
  const [read, setRead] = useState(false)
  const items: { title: string; text: string; time: string; icon: LucideIcon }[] = [
    { title: 'Appointment confirmed', text: 'Your visit with Dr. Priya Nair is confirmed for today at 3:30 PM.', time: '10 min ago', icon: CalendarDays },
    { title: 'Reminder · Tomorrow', text: 'You have an upcoming visit with Dr. Arjun Mehta at 10:00 AM.', time: 'Yesterday', icon: Bell },
    { title: 'Profile update', text: 'Your care team information was refreshed.', time: '12 Oct 2026', icon: Users },
  ]
  return <section className="panel notifications-panel"><SectionTitle title="Recent updates" action={<button className="text-link small-link" onClick={() => setRead(true)}>Mark all as read <Check size={14} /></button>} />{items.map(({ title, text, time, icon: Icon }, index) => <article className={`notification-row ${index === 0 && !read ? 'notification-unread' : ''}`} key={title}><span className="notification-icon"><Icon size={17} /></span><div><strong>{title}</strong><p>{text}</p><small>{time}</small></div>{index === 0 && !read && <i className="notification-dot" />}</article>)}</section>
}

function ReportsPage() {
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
  if (!user) return <Navigate to="/login" replace />
  const destination = pathForRole(user.role)
  if (user.role !== role) return destination ? <Navigate to={destination} replace /> : <Navigate to="/login" replace />
  return <PortalLayout role={role} />
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
  const [appointments, setAppointments] = useState(demo ? demoAppointments : [])
  const [liveDoctors, setLiveDoctors] = useState<DoctorRecord[]>([])
  const [doctorsLoading, setDoctorsLoading] = useState(!demo && role === 'patient')
  const [doctorsError, setDoctorsError] = useState('')
  const nav = portalNavigation[role]
  const pageTitle = routeTitles[page]?.title ?? 'Workspace'
  const openBooking = (doctor?: string) => { setSelectedDoctor(doctor); setBookingOpen(true) }
  const portalRoot = demo ? `/demo/${role}` : `/${role}`
  const pathFor = (path: string) => demo ? path.replace(`/${role}/`, `${portalRoot}/`) : path
  const activeRoute = pathFor(page === 'wards' || page === 'beds' ? '/admin/wards' : `/${role}/${page}`)
  const date = new Intl.DateTimeFormat('en', { weekday: 'short', month: 'short', day: 'numeric' }).format(new Date())
  useEffect(() => {
    if (demo || role !== 'patient') return
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
      return
    }
    setAppointments([])
    if (role !== 'patient' || !token || doctorsLoading) return
    let active = true
    listMyAppointments(token)
      .then((rows) => { if (active) setAppointments(rows.map((row) => displayAppointment(row, liveDoctors))) })
      .catch((cause) => { if (active) notify(cause instanceof Error ? cause.message : 'Could not load your appointments.') })
    return () => { active = false }
  }, [demo, role, token, doctorsLoading, liveDoctors])
  return <div className={`portal-shell ${dark ? 'theme-dark' : ''}`}><aside className={`portal-sidebar ${menuOpen ? 'sidebar-open' : ''}`}><div className="sidebar-brand-row"><Brand /><button className="mobile-nav-toggle side-close" aria-label="Close navigation" onClick={() => setMenuOpen(false)}><X size={18} /></button></div><div className="workspace-select"><span className="workspace-avatar">{role === 'patient' ? 'M' : role === 'doctor' ? 'C' : 'H'}</span><span><strong>{demo ? (role === 'patient' ? 'Maya’s care' : role === 'doctor' ? 'Care team' : 'Meridian Hospital') : user?.email ?? 'Medinex workspace'}</strong><small>{roleLabels[role]}</small></span><ChevronDown size={14} /></div><div className="sidebar-label">WORKSPACE</div><nav className="sidebar-nav" aria-label="Workspace navigation">{nav.map((item, index) => <div key={item.path}>{item.group && <div className={`nav-group-label ${index ? 'nav-group-spaced' : ''}`}>{item.group}</div>}<NavLink onClick={() => setMenuOpen(false)} to={pathFor(item.path)} className={() => `sidebar-link ${activeRoute === pathFor(item.path) || (activeRoute === pathFor('/admin/wards') && page === 'beds') ? 'active' : ''}`}><item.icon size={17} /><span>{item.label}</span>{item.label === 'Notifications' && <i className="nav-count">3</i>}</NavLink></div>)}</nav><div className="sidebar-bottom"><div className="help-card"><span><CircleHelp size={17} /></span><strong>Need a hand?</strong><small>Our team is here to help.</small><Link to="/contact">Get support <ArrowRight size={13} /></Link></div><div className="sidebar-user"><span className="user-avatar">{role === 'patient' ? 'MF' : role === 'doctor' ? 'AR' : 'AM'}</span><span><strong>{demo ? (role === 'patient' ? 'Maya Fernandes' : role === 'doctor' ? 'Dr. Ananya Rao' : 'Alex Morgan') : user?.email ?? 'Signed in'}</strong><small>{demo ? (role === 'patient' ? 'Patient' : role === 'doctor' ? 'Cardiologist' : 'Administrator') : roleLabels[role]}</small></span><button aria-label="Sign out" onClick={() => { signOut(); navigate('/login') }}><LogOut size={16} /></button></div></div></aside>
    {menuOpen && <button className="sidebar-scrim" aria-label="Close menu" onClick={() => setMenuOpen(false)} />}
    <div className="portal-main"><header className="portal-header"><button className="mobile-nav-toggle header-menu" aria-label="Open navigation" onClick={() => setMenuOpen(true)}><Menu size={20} /></button><div className="portal-breadcrumb"><Link to={pathFor(`/${role}/dashboard`)}>Workspace</Link><ChevronRight size={14} /><span>{page === 'dashboard' ? 'Overview' : pageTitle}</span></div><div className="portal-header-actions"><label className="portal-search"><Search size={16} /><input placeholder="Search this workspace…" value={search} onChange={(event) => setSearch(event.target.value)} aria-label="Search workspace" /><kbd>⌘ K</kbd></label><button className="theme-toggle" onClick={() => setDark(!dark)} aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'}>{dark ? <Sun size={17} /> : <Moon size={17} />}</button><button className="header-notification" aria-label="View notifications" onClick={() => navigate(pathFor(`/${role}/notifications`))}><Bell size={17} /><i /></button><span className="header-divider" /><span className="header-date">{date}</span><span className="header-avatar">{role === 'patient' ? 'MF' : role === 'doctor' ? 'AR' : 'AM'}</span></div></header>
      <main className="portal-content"><DemoBanner />{page === 'dashboard' ? <Dashboard role={role} appointments={appointments} onBook={() => role === 'patient' ? openBooking() : navigate(pathFor(`/${role}/${role === 'doctor' ? 'schedule' : 'appointments'}`))} /> : role === 'patient' && page === 'doctors' ? <><div className="page-heading"><div><div className="eyebrow eyebrow-muted">YOUR CARE TEAM</div><h1>{routeTitles.doctors.title}</h1><p>{routeTitles.doctors.subtitle}</p></div><Button onClick={() => openBooking()}>Book an appointment <ArrowRight size={15} /></Button></div><DoctorDirectory onBook={openBooking} search={search} doctors={liveDoctors} loading={!demo && doctorsLoading} error={!demo ? doctorsError : ''} demo={demo} /></> : (role === 'patient' && page === 'appointments' || role === 'doctor' && ['appointments','schedule','patients'].includes(page) || role === 'admin' && ['appointments','doctors','patients','departments','blood-requests','staff','audit-logs'].includes(page)) ? <GeneralListPage role={role} page={page} search={search} /> : (page === 'blood-availability' || page === 'blood-bank') ? <><div className="list-page-intro"><div><h1>{routeTitles[page].title}</h1><p>{routeTitles[page].subtitle}</p></div><span className="demo-pill"><span /> {demo ? 'SAMPLE INVENTORY' : 'LIVE INVENTORY'}</span></div><BloodAvailability admin={role === 'admin'} demo={demo} /></> : (page === 'bed-availability' || page === 'wards' || page === 'beds') ? <><div className="list-page-intro"><div><h1>{page === 'bed-availability' ? routeTitles['bed-availability'].title : 'Wards & beds'}</h1><p>{routeTitles['bed-availability'].subtitle}</p></div>{role === 'admin' && <Button onClick={() => notify('Ward setup will be available when operations services are connected.')}>+ Add ward</Button>}</div><BedAvailability admin={role === 'admin'} demo={demo} /></> : page === 'ai-assistant' ? <><div className="page-heading"><div><div className="eyebrow eyebrow-muted">A LITTLE HELP, WHEN YOU NEED IT</div><h1>{routeTitles[page].title}</h1><p>{routeTitles[page].subtitle}</p></div><span className="demo-pill"><span /> {demo ? 'PREVIEW MODE' : 'AI SERVICE'}</span></div><AssistantPreview demo={demo} /></> : page === 'profile' ? <><div className="list-page-intro"><div><h1>{routeTitles[page].title}</h1><p>{routeTitles[page].subtitle}</p></div></div><ProfilePage role={role} /></> : page === 'notifications' ? <><div className="list-page-intro"><div><h1>{routeTitles[page].title}</h1><p>{routeTitles[page].subtitle}</p></div><span className="demo-pill"><span /> SAMPLE UPDATES</span></div><NotificationsPage /></> : page === 'settings' ? <><div className="list-page-intro"><div><h1>{routeTitles[page].title}</h1><p>{routeTitles[page].subtitle}</p></div></div><SettingsPage /></> : page === 'reports' ? <><div className="list-page-intro"><div><h1>{routeTitles[page].title}</h1><p>{routeTitles[page].subtitle}</p></div><button className="export-button" onClick={() => notify('Report export will be available when reports connect to the hospital database.')}><FileDown size={15} /> Export</button></div><ReportsPage /></> : <Navigate to={pathFor(`/${role}/dashboard`)} replace />}</main>
    </div><BookModal open={bookingOpen} doctor={selectedDoctor} doctors={liveDoctors} demo={demo} onClose={() => setBookingOpen(false)} onBook={(appointment) => setAppointments((existing) => [appointment, ...existing])} />
  </div>
}

function App() {
  const [toast, setToast] = useState('')
  const dismiss = () => setToast('')
  const notify = (message: string) => setToast(message)
  return <AuthProvider><ToastContext.Provider value={notify}><Routes><Route path="/" element={<LandingPage />} /><Route path="/features" element={<InfoPage page="features" />} /><Route path="/about" element={<InfoPage page="about" />} /><Route path="/contact" element={<InfoPage page="contact" />} /><Route path="/login" element={<AuthPage kind="login" />} /><Route path="/register" element={<AuthPage kind="register" />} /><Route path="/forgot-password" element={<AuthPage kind="forgot" />} /><Route path="/patient/*" element={<PortalGate role="patient" />} /><Route path="/doctor/*" element={<PortalGate role="doctor" />} /><Route path="/admin/*" element={<PortalGate role="admin" />} /><Route path="/demo/patient/*" element={<PortalLayout role="patient" demo />} /><Route path="/demo/doctor/*" element={<PortalLayout role="doctor" demo />} /><Route path="/demo/admin/*" element={<PortalLayout role="admin" demo />} /><Route path="*" element={<Navigate to="/" replace />} /></Routes>{toast && <Toast message={toast} onDismiss={dismiss} />}</ToastContext.Provider></AuthProvider>
}

export default App
