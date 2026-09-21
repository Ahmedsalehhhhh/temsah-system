import { isAdminOrAbove } from '../app/core/permissions'
import { NavLink, Outlet } from 'react-router-dom'
import { usePayroll } from '../context/PayrollContext'
import { useAuth } from '../context/AuthContext'
import { Button, Select } from './ui'
import { useState } from 'react'

const nav = [
  { to: '/', label: 'نظرة عامة', icon: '◧' },
  { to: '/streamers', label: 'الستريمرز', icon: '▣' },
  { to: '/recruiters', label: 'الريكروترز', icon: '◈' },
  { to: '/recruiting-list', label: 'سجل الريكروتينج', icon: '≡' },
  { to: '/management', label: 'الإدارة', icon: '◆' },
  { to: '/it', label: 'IT', icon: '◇' },
  { to: '/settings', label: 'الإعدادات', icon: '⚙' },
]

export default function Layout() {
  const { state, loading, error, setCurrentPeriod, addPeriod, closePeriod } = usePayroll()
  const { user, logout } = useAuth()
  const [adding, setAdding] = useState(false)
  const [label, setLabel] = useState('')
  const currentPeriod = state.periods.find((p) => p.id === state.currentPeriodId)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base-950 text-ink-500 text-sm">
        جاري تحميل البيانات من السيرفر...
      </div>
    )
  }

  return (
    <div className="min-h-screen flex">
      <aside className="w-60 shrink-0 border-l border-base-700 bg-base-900 flex flex-col">
        <div className="px-5 py-6 border-b border-base-700">
          <div className="font-display text-gold-400 text-lg font-semibold tracking-tight">GOLDEN STREAMERS</div>
          <div className="text-xs text-ink-500 mt-0.5">نظام الرواتب</div>
        </div>
        <nav className="flex-1 py-4 px-3 flex flex-col gap-1">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors ${
                  isActive ? 'bg-gold-500/10 text-gold-400' : 'text-ink-300 hover:bg-base-800 hover:text-ink-100'
                }`
              }
            >
              <span className="text-base leading-none opacity-70">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="px-5 py-4 border-t border-base-700">
          <div className="text-sm text-ink-300">{user?.name}</div>
          <div className="text-[11px] text-ink-700 mb-3">{isAdminOrAbove(user?.role) ? 'أدمن' : 'موظف'}</div>
          <Button variant="ghost" onClick={logout} className="w-full justify-center">
            تسجيل خروج
          </Button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-base-700 bg-base-900/60 flex items-center justify-between px-6 gap-4">
          <div className="flex items-center gap-3">
            <span className="text-xs text-ink-500">فترة الرواتب</span>
            <Select value={state.currentPeriodId} onChange={(e) => setCurrentPeriod(e.target.value)}>
              {state.periods.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label} {p.status === 'closed' ? '· مقفولة' : ''}
                </option>
              ))}
            </Select>
            {currentPeriod?.status === 'open' ? (
              isAdminOrAbove(user?.role) && (
                <Button variant="outline" onClick={() => closePeriod(currentPeriod.id)}>
                  قفل الفترة
                </Button>
              )
            ) : (
              <span className="text-xs text-bad">هذه الفترة مقفولة — للعرض فقط</span>
            )}
          </div>

          {isAdminOrAbove(user?.role) && (adding ? (
            <div className="flex items-center gap-2">
              <input
                autoFocus
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="اسم الفترة، مثلاً أكتوبر 2026"
                className="bg-base-850 border border-base-700 rounded-md px-3 py-2 text-sm text-ink-100 focus-ring"
              />
              <Button
                onClick={() => {
                  if (label.trim()) {
                    addPeriod(label.trim())
                    setLabel('')
                    setAdding(false)
                  }
                }}
              >
                إنشاء
              </Button>
              <Button variant="ghost" onClick={() => setAdding(false)}>
                إلغاء
              </Button>
            </div>
          ) : (
            <Button variant="outline" onClick={() => setAdding(true)}>
              + فترة رواتب جديدة
            </Button>
          ))}
        </header>

        <main className="flex-1 p-6 overflow-auto">
          {error && (
            <div className="mb-4 text-sm text-bad bg-bad/10 border border-bad/20 rounded-md px-4 py-2.5">{error}</div>
          )}
          <Outlet />
        </main>
      </div>
    </div>
  )
}
