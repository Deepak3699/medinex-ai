import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { getCurrentUser, registerPatient, signIn, type User } from './api'

const SESSION_KEY = 'medinex.session-token'

type AuthValue = {
  user: User | null
  token: string | null
  ready: boolean
  signInUser: (email: string, password: string) => Promise<User>
  registerPatientUser: (input: { name: string; email: string; password: string }) => Promise<User>
  signOut: () => void
}

const AuthContext = createContext<AuthValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const savedToken = window.sessionStorage.getItem(SESSION_KEY)
    if (!savedToken) {
      setReady(true)
      return
    }

    let active = true
    getCurrentUser(savedToken)
      .then((currentUser) => {
        if (!active) return
        setToken(savedToken)
        setUser(currentUser)
      })
      .catch(() => window.sessionStorage.removeItem(SESSION_KEY))
      .finally(() => {
        if (active) setReady(true)
      })

    return () => { active = false }
  }, [])

  const establishSession = async (accessToken: string) => {
    const currentUser = await getCurrentUser(accessToken)
    window.sessionStorage.setItem(SESSION_KEY, accessToken)
    setToken(accessToken)
    setUser(currentUser)
    return currentUser
  }

  const signInUser = async (email: string, password: string) => {
    const result = await signIn(email, password)
    return establishSession(result.access_token)
  }

  const registerPatientUser = async (input: { name: string; email: string; password: string }) => {
    await registerPatient(input)
    return signInUser(input.email, input.password)
  }

  const signOut = () => {
    window.sessionStorage.removeItem(SESSION_KEY)
    setToken(null)
    setUser(null)
  }

  return <AuthContext.Provider value={{ user, token, ready, signInUser, registerPatientUser, signOut }}>
    {children}
  </AuthContext.Provider>
}

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used inside AuthProvider.')
  return value
}
