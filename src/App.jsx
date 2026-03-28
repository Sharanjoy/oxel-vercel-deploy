import { useEffect, useState } from 'react'
import { Link, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { signInWithPopup } from 'firebase/auth'
import { addDoc, collection, serverTimestamp } from 'firebase/firestore'
import { auth, db, githubProvider, googleProvider, hasFirebaseConfig } from './firebaseClient'

const EMAIL = 'sharanjoy@protonmail.com'
const MAILTO_URL = `mailto:${EMAIL}?subject=Book%20Demo%20Request%20-%20Oxel`
const LINKEDIN_URL = 'https://www.linkedin.com/in/sharan-v-5421802b9/'
const LINKEDIN_USERNAME = 'sharan-v-5421802b9'
const GITHUB_URL = 'https://github.com/sharanjoy'
const GITHUB_USERNAME = 'sharanjoy'
const SIGNUP_URL = '/signup'
const SESSION_KEY = 'oxel_app_session'

function generateSessionToken() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const bytes = new Uint8Array(16)
    crypto.getRandomValues(bytes)
    return Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.6 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.7 1.1 7.8 3l5.7-5.7C34.1 6.2 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.5 19 12 24 12c3 0 5.7 1.1 7.8 3l5.7-5.7C34.1 6.2 29.3 4 24 4c-7.7 0-14.3 4.3-17.7 10.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 10-2 13.6-5.2l-6.3-5.3c-2 1.5-4.5 2.5-7.3 2.5-5.2 0-9.6-3.3-11.3-8l-6.6 5.1C9.6 39.7 16.3 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-1.1 3-3.1 5.4-5.9 7l6.3 5.3c-.4.3 8.3-6 8.3-16.3 0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  )
}

function GithubIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 2a10 10 0 0 0-3.2 19.5c.5.1.7-.2.7-.5v-1.8c-2.8.6-3.4-1.2-3.4-1.2-.5-1.2-1.1-1.5-1.1-1.5-.9-.6.1-.6.1-.6 1 .1 1.6 1 1.6 1 .9 1.5 2.3 1.1 2.8.8.1-.7.3-1.1.6-1.4-2.2-.3-4.6-1.1-4.6-5A3.9 3.9 0 0 1 6.5 8c-.1-.3-.5-1.3.1-2.7 0 0 .9-.3 2.9 1a10 10 0 0 1 5.3 0c2-1.3 2.9-1 2.9-1 .6 1.4.2 2.4.1 2.7a3.9 3.9 0 0 1 1 2.6c0 3.9-2.4 4.7-4.7 5 .4.3.7.9.7 1.8V21c0 .3.2.6.7.5A10 10 0 0 0 12 2z"
      />
    </svg>
  )
}

function readSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function saveSession(session) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session))
}

function clearSession() {
  localStorage.removeItem(SESSION_KEY)
}

function AuthModal({ open, onClose, onAuthSuccess }) {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState({ type: '', message: '' })

  if (!open) return null

  const continueLogin = async () => {
    const normalizedEmail = email.trim().toLowerCase()
    if (!normalizedEmail) {
      setStatus({ type: 'error', message: 'Enter your email to continue.' })
      return
    }

    const nextSession = {
      email: normalizedEmail,
      provider: 'email',
      token: generateSessionToken(),
    }
    onAuthSuccess(nextSession)
    setStatus({ type: 'success', message: 'Login successful.' })

    if (db) {
      addDoc(collection(db, 'login_emails'), {
        email: normalizedEmail,
        provider: 'email',
        sessionToken: nextSession.token,
        createdAt: serverTimestamp(),
      }).catch((error) => {
        console.error('login_emails write failed:', error)
      })
    }

    onClose()
  }

  const socialLogin = async (provider, providerName) => {
    if (!auth) return
    try {
      const result = await signInWithPopup(auth, provider)
      const nextSession = {
        email: result.user.email || 'unknown@user',
        provider: providerName,
        token: result.user.uid,
      }

      onAuthSuccess(nextSession)

      if (db) {
        addDoc(collection(db, 'login_emails'), {
          email: nextSession.email,
          provider: providerName,
          sessionToken: nextSession.token,
          createdAt: serverTimestamp(),
        }).catch((error) => {
          console.error('login_emails write failed:', error)
        })
      }
      onClose()
    } catch (error) {
      setStatus({ type: 'error', message: error.message || `Failed to login with ${providerName}` })
    }
  }

  return (
    <div className="auth-modal-backdrop" onClick={onClose} role="presentation">
      <section className="auth-card auth-modal" onClick={(event) => event.stopPropagation()}>
        <h1>Sign up / Login</h1>
        <p>Enter your email to continue.</p>
        {status.message && <p className={`form-status ${status.type}`}>{status.message}</p>}
        <div className="auth-buttons">
          <input
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <button className="btn btn-dark" type="button" onClick={continueLogin}>
            Continue with Email
          </button>
          <div className="auth-social-row">
            <button
              className="icon-auth-btn"
              type="button"
              aria-label="Continue with Google"
              title="Continue with Google"
              onClick={() => socialLogin(googleProvider, 'google')}
            >
              <GoogleIcon />
            </button>
            <button
              className="icon-auth-btn"
              type="button"
              aria-label="Continue with GitHub"
              title="Continue with GitHub"
              onClick={() => socialLogin(githubProvider, 'github')}
            >
              <GithubIcon />
            </button>
          </div>
          <button className="btn btn-light" type="button" onClick={onClose}>
            Cancel
          </button>
        </div>
      </section>
    </div>
  )
}

function BookDemoButton({ className = '', label = 'Book Demo', session, onRequireAuth }) {
  const onClick = (event) => {
    if (!session) {
      event.preventDefault()
      onRequireAuth()
    }
  }

  return (
    <div className={`demo-picker ${className}`}>
      <a className="btn btn-dark" href={MAILTO_URL} onClick={onClick}>
        {label}
      </a>
    </div>
  )
}

function GuardedLink({ to, className, children, session, onRequireAuth }) {
  return (
    <Link
      className={className}
      to={to}
      onClick={(event) => {
        if (!session) {
          event.preventDefault()
          onRequireAuth()
        }
      }}
    >
      {children}
    </Link>
  )
}

function Navbar({ session, onRequireAuth, onSignOut }) {
  const [showMenu, setShowMenu] = useState(false)

  const onBookDemoClick = (event) => {
    if (!session) {
      event.preventDefault()
      onRequireAuth()
    }
    setShowMenu(false)
  }

  return (
    <header className="topbar">
      <Link className="brand" to="/">
        Oxel
      </Link>
      <div className="top-actions">
        {session ? (
          <button className="btn btn-light" type="button" onClick={onSignOut}>
            Logout
          </button>
        ) : (
          <button className="btn btn-light" type="button" onClick={onRequireAuth}>
            Login
          </button>
        )}
        <div className="menu-wrap">
          <button className="icon-menu-btn" type="button" onClick={() => setShowMenu((v) => !v)}>
            &#8942;
          </button>
          {showMenu && (
            <div className="icon-menu">
              <Link to="/" onClick={() => setShowMenu(false)}>
                Home
              </Link>
              <Link to="/flexo" onClick={() => setShowMenu(false)}>
                FlexO
              </Link>
              <Link to="/velora" onClick={() => setShowMenu(false)}>
                Velora
              </Link>
              <a href="/#contact" onClick={() => setShowMenu(false)}>
                Contact
              </a>
              <a href={MAILTO_URL} onClick={onBookDemoClick}>
                Book Demo
              </a>
              {!session && (
                <>
                  <div className="icon-menu-divider" />
                  <button
                    type="button"
                    className="icon-menu-action"
                    onClick={() => {
                      setShowMenu(false)
                      onRequireAuth()
                    }}
                  >
                    Login with Email
                  </button>
                  <button
                    type="button"
                    className="icon-menu-action"
                    onClick={() => {
                      setShowMenu(false)
                      onRequireAuth()
                    }}
                  >
                    Login with Google
                  </button>
                  <button
                    type="button"
                    className="icon-menu-action"
                    onClick={() => {
                      setShowMenu(false)
                      onRequireAuth()
                    }}
                  >
                    Login with GitHub
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

function Footer() {
  return (
    <footer>
      <p>&copy; Oxel. All rights reserved.</p>
      <div className="footer-links">
        <a href="#">Privacy Policy</a>
        <a href="#">Terms &amp; Conditions</a>
      </div>
    </footer>
  )
}

function ContactIconLinks() {
  return (
    <div className="contact-icon-links" aria-label="Contact links">
      <a
        className="contact-only-icon"
        href={`mailto:${EMAIL}`}
        aria-label="Email Oxel"
        title="Email"
      >
        <img
          className="contact-icon"
          src="https://api.iconify.design/material-symbols:mail-outline.svg?color=%23001c3f"
          alt=""
          loading="lazy"
        />
      </a>
      <a
        className="contact-only-icon"
        href={LINKEDIN_URL}
        target="_blank"
        rel="noreferrer"
        aria-label="Open LinkedIn profile"
        title="LinkedIn"
      >
        <img
          className="contact-icon"
          src="/linkedin.png"
          alt=""
          loading="lazy"
        />
      </a>
      <a
        className="contact-only-icon"
        href={GITHUB_URL}
        target="_blank"
        rel="noreferrer"
        aria-label="Open GitHub profile"
        title="GitHub"
      >
        <img
          className="contact-icon"
          src="https://cdn.simpleicons.org/github/181717"
          alt=""
          loading="lazy"
        />
      </a>
    </div>
  )
}

function HomeForms({ session, onRequireAuth }) {
  const [projectStatus, setProjectStatus] = useState({ type: '', message: '' })
  const [showProjectPopup, setShowProjectPopup] = useState(false)
  const [isSubmittingProject, setIsSubmittingProject] = useState(false)

  const pushNotification = async (title, body) => {
    if (!('Notification' in window)) return
    if (Notification.permission === 'default') await Notification.requestPermission()
    if (Notification.permission === 'granted') new Notification(title, { body })
  }

  const onProjectSubmit = async (event) => {
    event.preventDefault()
    if (!session) {
      onRequireAuth()
      return
    }
    const form = event.currentTarget
    const data = Object.fromEntries(new FormData(form).entries())

    if (!db) {
      setProjectStatus({ type: 'error', message: 'Firebase is not configured yet.' })
      return
    }

    try {
      setIsSubmittingProject(true)
      setProjectStatus({ type: '', message: '' })
      await addDoc(collection(db, 'site_inquiries'), {
        inquiryType: 'project',
        authEmail: session.email,
        name: data.name,
        phone: data.phone,
        email: data.email,
        projectDescription: data.projectDescription,
        sourcePage: window.location.pathname,
        createdAt: serverTimestamp(),
      })
      form.reset()
      setProjectStatus({ type: 'success', message: 'Request submitted. Our team will contact you soon.' })
      pushNotification('Oxel', 'New project request received.')
      setShowProjectPopup(true)
      setTimeout(() => setShowProjectPopup(false), 3500)
    } catch (error) {
      const code = error?.code || ''
      let message = error?.message || 'Unknown error'
      if (code === 'permission-denied') {
        message = 'Write blocked by Firestore rules. Please allow authenticated users to create in site_inquiries.'
      } else if (code === 'unavailable') {
        message = 'Firebase service unavailable. Check internet and try again.'
      }
      setProjectStatus({ type: 'error', message: `Failed to submit (${code || 'no-code'}): ${message}` })
    } finally {
      setIsSubmittingProject(false)
    }
  }

  return (
    <>
      <section className="section" id="build-your-system">
        <h2>Build Your System</h2>
        <p className="intro">Fill the form and our team will reach you.</p>
        {projectStatus.message && <p className={`form-status ${projectStatus.type}`}>{projectStatus.message}</p>}
        <form className="form" onSubmit={onProjectSubmit}>
          <input name="name" placeholder="Name" required />
          <input name="phone" placeholder="Phone" required />
          <input name="email" placeholder="Email" type="email" required />
          <textarea name="projectDescription" placeholder="Project Description" rows="4" required />
          <button className="btn btn-dark" type="submit" disabled={isSubmittingProject}>
            {isSubmittingProject ? 'Submitting...' : 'Submit Request'}
          </button>
        </form>
        {showProjectPopup && (
          <div className="submit-popup" role="status" aria-live="polite">
            Build Your System request submitted successfully.
          </div>
        )}
      </section>

      <section className="section" id="contact">
        <h2>Contact</h2>
        <p className="intro">Get in touch to see Oxel in action.</p>
        <ContactIconLinks />
      </section>
    </>
  )
}

function HomePage({ session, onRequireAuth }) {
  return (
    <main>
      <section className="hero">
        <div>
          <h1>Oxel - Engineering Real-World Systems.</h1>
          <p>Turning real-world challenges into working systems.</p>
          <div className="row">
            <a className="btn btn-light" href="#products">
              Explore Products
            </a>
            <BookDemoButton session={session} onRequireAuth={onRequireAuth} />
          </div>
        </div>
      </section>

      <section className="section" id="products">
        <h2>Products</h2>
        <div className="grid two">
          <article className="card">
            <h3>FlexO</h3>
            <p>A simple system to manage members, attendance, and payments in one place.</p>
            <GuardedLink className="text-link" to="/flexo" session={session} onRequireAuth={onRequireAuth}>
              View Details
            </GuardedLink>
          </article>
          <article className="card">
            <h3>Velora</h3>
            <p>A unified system for attendance and real-time tracking.</p>
            <GuardedLink className="text-link" to="/velora" session={session} onRequireAuth={onRequireAuth}>
              View Details
            </GuardedLink>
          </article>
        </div>
      </section>

      <section className="section">
        <h2>Value</h2>
        <div className="grid">
          <article className="card">
            <h3>Built for real-world use</h3>
          </article>
          <article className="card">
            <h3>Reliable and scalable</h3>
          </article>
          <article className="card">
            <h3>Simple and easy to use</h3>
          </article>
          <article className="card">
            <h3>Designed for efficiency</h3>
          </article>
        </div>
      </section>

      <section className="section how-it-works">
        <h2>How it works</h2>
        <div className="grid how-grid">
          <article className="card step-card">
            <span className="step-pill">STEP 1</span>
            <h3>Setup</h3>
            <p>We set up the system based on your needs.</p>
          </article>
          <article className="card step-card">
            <span className="step-pill">STEP 2</span>
            <h3>Track</h3>
            <p>All data is captured and updated automatically.</p>
          </article>
          <article className="card step-card">
            <span className="step-pill">STEP 3</span>
            <h3>Manage</h3>
            <p>Monitor and manage everything from one place.</p>
          </article>
        </div>
      </section>

      <section className="section">
        <h2>About</h2>
        <p className="intro">
          Oxel focuses on building systems that solve real-world operational challenges through thoughtful engineering.
          We design practical products for teams that need clarity, speed, and reliability in day-to-day operations.
          Our goal is to simplify complex workflows into smart, scalable systems that create measurable impact.
        </p>
      </section>

      <section className="section">
        <h2>Founder</h2>
        <p className="intro">
          I&apos;m Sharan, Founder of <strong>Oxel</strong>. I build practical systems that solve real-world operational
          challenges with a hands-on engineering approach, turning complex problems into simple, working solutions.
          Oxel was started with one clear mission: create technology that is reliable, easy to use, and truly useful
          for people running real operations every day. <span className="founder-highlight">From idea to execution,</span>{' '}
          I focus on building with clarity, speed, and long-term impact.
        </p>
      </section>

      <HomeForms session={session} onRequireAuth={onRequireAuth} />
    </main>
  )
}

function FlexoPage({ session, onRequireAuth }) {
  return (
    <main className="page-gap">
      <section className="section hero hero-lite hero-product">
        <div className="hero-pill">GYM OPERATIONS PLATFORM</div>
        <h1>FlexO</h1>
        <p className="intro">
          Smart gym operations platform for membership, attendance, and payments with real-time visibility.
        </p>
        <div className="row">
          <BookDemoButton session={session} onRequireAuth={onRequireAuth} />
          <a
            className="btn btn-trial"
            href={SIGNUP_URL}
            onClick={(event) => {
              if (!session) {
                event.preventDefault()
                onRequireAuth()
              }
            }}
          >
            Start Free Trial
          </a>
        </div>
      </section>
      <section className="section cta-box about-flexo-box flexo-info-box">
        <h2>About</h2>
        <p className="intro">
          FlexO helps gym owners and trainers run day-to-day operations without manual registers, scattered sheets, and
          payment confusion. It gives one clean dashboard for operations and growth.
        </p>
      </section>
      <section className="section">
        <h2>What it does</h2>
        <div className="grid">
          <article className="card">
            <h3>Membership Management</h3>
            <p>Track plans, renewals, and member lifecycle from one place.</p>
          </article>
          <article className="card">
            <h3>Attendance Tracking</h3>
            <p>Capture check-ins automatically with clear daily and monthly reports.</p>
          </article>
          <article className="card">
            <h3>Payment Monitoring</h3>
            <p>Reduce missed payments with reminders and clear collection visibility.</p>
          </article>
        </div>
      </section>
      <section className="section">
        <h2>Benefits</h2>
        <div className="grid">
          <article className="card">
            <h3>Faster Front Desk</h3>
            <p>Less manual work and faster member handling during peak hours.</p>
          </article>
          <article className="card">
            <h3>Better Retention</h3>
            <p>Stay ahead with renewal visibility and member engagement insights.</p>
          </article>
          <article className="card">
            <h3>Clear Cash Flow</h3>
            <p>Get daily payment status with less leakage and fewer follow-up calls.</p>
          </article>
        </div>
      </section>
      <section className="section cta-box about-flexo-box flexo-info-box">
        <h2>Security</h2>
        <p className="intro">
          Secure architecture with role-based access ensures that member and payment data stays protected.
        </p>
      </section>
      <section className="section cta-box">
        <h2>Ready to run your gym smarter?</h2>
        <p className="intro">See FlexO live and understand how it fits your gym workflow in minutes.</p>
        <div className="row">
          <BookDemoButton session={session} onRequireAuth={onRequireAuth} />
          <a
            className="btn btn-trial"
            href={SIGNUP_URL}
            onClick={(event) => {
              if (!session) {
                event.preventDefault()
                onRequireAuth()
              }
            }}
          >
            Start Free Trial
          </a>
        </div>
      </section>
      <section className="section" id="contact">
        <h2>Contact</h2>
        <ContactIconLinks />
      </section>
    </main>
  )
}

function VeloraPage({ session, onRequireAuth }) {
  return (
    <main className="page-gap">
      <section className="section hero hero-lite hero-product">
        <div className="hero-pill">NFC ATTENDANCE + SCHOOL BUS TRACKING</div>
        <h1>Velora</h1>
        <p className="intro">
          Velora is built for school student safety with NFC-based attendance and live bus tracking in one system.
        </p>
      </section>
      <section className="section cta-box flexo-info-box">
        <h2>About</h2>
        <p className="intro">
          Velora helps schools track attendance through NFC and monitor school buses in real time, while connecting
          parents, teachers, and admins on one secure platform.
        </p>
      </section>
      <section className="section">
        <h2>Features</h2>
        <div className="velora-feature-board">
          <article className="card feature-group">
            <h3>Core Features</h3>
            <ul className="feature-list">
              <li><span className="feature-dot">•</span>NFC-based student attendance with instant entry logs</li>
              <li><span className="feature-dot">•</span>Live GPS school bus tracking for student pickup and drop safety</li>
              <li><span className="feature-dot">•</span>Smart student dashboard (attendance, marks, progress)</li>
              <li><span className="feature-dot">•</span>Parent monitoring with real-time updates</li>
              <li><span className="feature-dot">•</span>Teacher tools for attendance, grading, and class management</li>
              <li><span className="feature-dot">•</span>Admin panel for full system control</li>
              <li><span className="feature-dot">•</span>Instant notifications and alerts</li>
              <li><span className="feature-dot">•</span>Performance analytics with visual reports</li>
              <li><span className="feature-dot">•</span>Secure login with role-based access (Student / Parent / Teacher / Admin)</li>
              <li><span className="feature-dot">•</span>Cloud-based system with real-time sync</li>
            </ul>
          </article>
          <article className="card feature-group">
            <h3>Additional Features</h3>
            <ul className="feature-list">
              <li><span className="feature-dot">•</span>Timetable management</li>
              <li><span className="feature-dot">•</span>Homework and assignment tracking</li>
              <li><span className="feature-dot">•</span>In-app communication (teacher and parent)</li>
              <li><span className="feature-dot">•</span>Online fee payment integration</li>
            </ul>
          </article>
        </div>
      </section>
      <section className="section velora-how">
        <h2>How it works</h2>
        <p className="intro">A simple real-time flow built for student safety and parent visibility.</p>
        <div className="velora-how-grid">
          <article className="velora-step">
            <span className="velora-step-no">01</span>
            <h3>Student taps NFC card</h3>
            <p>Entry is captured automatically at the point of scan.</p>
          </article>
          <article className="velora-step">
            <span className="velora-step-no">02</span>
            <h3>Attendance is recorded instantly</h3>
            <p>No manual register required, logs are saved immediately.</p>
          </article>
          <article className="velora-step">
            <span className="velora-step-no">03</span>
            <h3>System updates in real time</h3>
            <p>Dashboard data syncs live for staff and administration.</p>
          </article>
          <article className="velora-step">
            <span className="velora-step-no">04</span>
            <h3>Parents get instant alerts</h3>
            <p>Notifications are triggered as soon as attendance changes.</p>
          </article>
          <article className="velora-step">
            <span className="velora-step-no">05</span>
            <h3>Bus location is tracked live</h3>
            <p>Parents and schools can monitor route movement in real time.</p>
          </article>
        </div>
      </section>
      <section className="section">
        <h2>Vision</h2>
        <p className="intro">
          To improve school student safety and operations through NFC attendance, real-time bus tracking, and connected
          communication.
        </p>
      </section>
      <section className="section cta-box">
        <h2>Bring clarity, communication, and control into your institution.</h2>
        <div className="row">
          <BookDemoButton session={session} onRequireAuth={onRequireAuth} />
          <a
            className="btn btn-trial"
            href={SIGNUP_URL}
            onClick={(event) => {
              if (!session) {
                event.preventDefault()
                onRequireAuth()
              }
            }}
          >
            Start Free Trial
          </a>
        </div>
      </section>
      <section className="section" id="contact">
        <h2>Contact</h2>
        <ContactIconLinks />
      </section>
    </main>
  )
}

function SignupPage({ session, onRequireAuth }) {
  return (
    <main className="page-gap">
      <section className="section hero-lite">
        <h1>Start Free Trial</h1>
        <p className="intro">Please sign up to continue trial onboarding.</p>
        <div className="row">
          {!session && (
            <button className="btn btn-dark" type="button" onClick={onRequireAuth}>
              Login with Email
            </button>
          )}
          {session && <BookDemoButton session={session} onRequireAuth={onRequireAuth} />}
        </div>
      </section>
    </main>
  )
}

function AppContent({ session, onRequireAuth }) {
  const location = useLocation()

  useEffect(() => {
    if (!db || !session) return
    addDoc(collection(db, 'site_visits'), {
      authEmail: session.email,
      provider: session.provider,
      pagePath: location.pathname,
      userAgent: navigator.userAgent,
      sessionToken: session.token,
      createdAt: serverTimestamp(),
    }).catch((error) => {
      console.error('site_visits write failed:', error)
    })
  }, [location.pathname, session])

  return (
    <div className="site">
      <Navbar
        session={session}
        onRequireAuth={onRequireAuth}
        onSignOut={() => {
          clearSession()
          window.location.reload()
        }}
      />
      <Routes>
        <Route path="/" element={<HomePage session={session} onRequireAuth={onRequireAuth} />} />
        <Route path="/flexo" element={<FlexoPage session={session} onRequireAuth={onRequireAuth} />} />
        <Route path="/velora" element={<VeloraPage session={session} onRequireAuth={onRequireAuth} />} />
        <Route path="/signup" element={<SignupPage session={session} onRequireAuth={onRequireAuth} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Footer />
    </div>
  )
}

function App() {
  const [session, setSession] = useState(readSession())
  const [showAuth, setShowAuth] = useState(false)
  const [showSplash, setShowSplash] = useState(true)

  useEffect(() => {
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection
    let splashDuration = 3500

    if (connection) {
      const effectiveType = connection.effectiveType || ''
      const downlink = Number(connection.downlink || 0)
      if (effectiveType.includes('2g') || (downlink > 0 && downlink < 1.5)) splashDuration = 5000
      else if (effectiveType === '3g' || (downlink > 0 && downlink < 5)) splashDuration = 4200
      else splashDuration = 3000
    }

    const timer = setTimeout(() => setShowSplash(false), splashDuration)
    return () => clearTimeout(timer)
  }, [])

  const onRequireAuth = () => {
    if (!hasFirebaseConfig) return
    if (!session) setShowAuth(true)
  }

  const onAuthSuccess = (nextSession) => {
    setSession(nextSession)
    saveSession(nextSession)
  }

  if (showSplash) {
    return (
      <main className="splash-screen">
        <div className="splash-content">
          <div className="splash-logo">Oxel</div>
          <p className="splash-tagline">Engineering Real-World</p>
        </div>
      </main>
    )
  }

  return (
    <>
      <AppContent session={session} onRequireAuth={onRequireAuth} />
      <AuthModal open={showAuth} onClose={() => setShowAuth(false)} onAuthSuccess={onAuthSuccess} />
    </>
  )
}

export default App


