import { createContext, useContext, useEffect, useState } from 'react'
import { api, getToken, setToken } from '../lib/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = getToken()
    if (!token) {
      setLoading(false)
      return
    }
    api
      .get('/auth/me')
      .then((data) => setUser(data.user))
      .catch(() => setToken(null))
      .finally(() => setLoading(false))
  }, [])

  async function login(email, password) {
    const data = await api.post('/auth/login', { email, password })
    setToken(data.token)
    setUser(data.user)
  }

  async function register(name, email, password) {
    const data = await api.post('/auth/register', { name, email, password })
    setToken(data.token)
    setUser(data.user)
  }

  function logout() {
    setToken(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
