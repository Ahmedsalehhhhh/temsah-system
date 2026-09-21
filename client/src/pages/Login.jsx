import { useState } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Card, Button, Field, Input } from '../components/ui'

export default function Login() {
  const { user, login, register } = useAuth()
  const navigate = useNavigate()
  const [mode, setMode] = useState('login') // 'login' | 'register'
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (user) return <Navigate to="/" replace />

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      if (mode === 'login') {
        await login(form.email, form.password)
      } else {
        await register(form.name, form.email, form.password)
      }
      navigate('/')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-base-950 px-4">
      <Card className="w-full max-w-sm p-6">
        <div className="mb-6 text-center">
          <div className="font-display text-gold-400 text-lg font-semibold tracking-tight">GOLDEN STREAMERS</div>
          <div className="text-xs text-ink-500 mt-1">نظام الرواتب</div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {mode === 'register' && (
            <Field label="الاسم">
              <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </Field>
          )}
          <Field label="الإيميل">
            <Input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </Field>
          <Field label="الباسورد">
            <Input type="password" required minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </Field>

          {error && <p className="text-xs text-bad">{error}</p>}

          <Button type="submit" disabled={busy} className="justify-center mt-2">
            {busy ? '...' : mode === 'login' ? 'دخول' : 'إنشاء حساب'}
          </Button>
        </form>

        <button
          type="button"
          onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError('') }}
          className="text-xs text-ink-500 hover:text-gold-400 mt-5 w-full text-center"
        >
          {mode === 'login' ? 'مفيش حساب؟ اعمل واحد' : 'عندك حساب؟ سجل دخول'}
        </button>

        {mode === 'register' && (
          <p className="text-[11px] text-ink-700 mt-3 text-center">
            أول حساب بيتعمل على النظام بياخد صلاحية أدمن تلقائيًا.
          </p>
        )}
      </Card>
    </div>
  )
}
