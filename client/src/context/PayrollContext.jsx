import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react'
import { api } from '../lib/api'
import { useAuth } from './AuthContext'

const PayrollContext = createContext(null)

const normId = (doc) => (doc ? { ...doc, id: doc._id } : doc)
const normList = (list) => (list || []).map(normId)

const defaultSettings = {
  egpConversionRate: 50,
  managementItBaseSalary: 8000,
  tierAmounts: { 1: 0, 2: 1500, 3: 1000, 4: 500, 5: 0 },
  streamerRules: {
    defaultRate: 0.5,
    standard: { score: 150000, days: 20, hours: 60, pct: 0.03 },
    extra: { score: 150000, days: 22, hours: 100, pct: 0.02 },
  },
  managementTierMode: 'manual',
  itTierMode: 'manual',
}

export function PayrollProvider({ children }) {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [settings, setSettings] = useState(defaultSettings)
  const [periods, setPeriods] = useState([])
  const [currentPeriodId, setCurrentPeriodIdState] = useState(null)
  const [streamers, setStreamers] = useState([])
  const [recruiters, setRecruiters] = useState([])
  const [managementEmployees, setManagementEmployees] = useState([])
  const [itEmployees, setItEmployees] = useState([])

  const [streamerPerformance, setStreamerPerformance] = useState([])
  const [recruitingRecords, setRecruitingRecords] = useState([])
  const [recruiterAdjustments, setRecruiterAdjustments] = useState([])
  const [managementRows, setManagementRows] = useState([])
  const [itRows, setItRows] = useState([])

  // --- Master data: loaded once per login ---
  const loadMasterData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [s, p, st, rc, mgmt, it] = await Promise.all([
        api.get('/settings'),
        api.get('/periods'),
        api.get('/streamers'),
        api.get('/recruiters'),
        api.get('/employees/management'),
        api.get('/employees/it'),
      ])
      setSettings(s)
      const normPeriods = normList(p)
      setPeriods(normPeriods)
      setStreamers(normList(st))
      setRecruiters(normList(rc))
      setManagementEmployees(normList(mgmt))
      setItEmployees(normList(it))
      setCurrentPeriodIdState((prev) => prev || normPeriods[normPeriods.length - 1]?.id || null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (user) loadMasterData()
  }, [user, loadMasterData])

  // --- Monthly data: reloaded whenever the selected period changes ---
  const loadPeriodData = useCallback(async (periodId) => {
    if (!periodId) return
    try {
      const [perf, records, adjustments, mgmtRows, itR] = await Promise.all([
        api.get(`/streamers/performance/${periodId}`),
        api.get(`/recruiting-records/${periodId}`),
        api.get(`/recruiters/adjustments/${periodId}`),
        api.get(`/employees/management/rows/${periodId}`),
        api.get(`/employees/it/rows/${periodId}`),
      ])
      setStreamerPerformance(
        perf.map((p) => ({ periodId: p.period, streamerId: p.streamer, score: p.score, days: p.days, hours: p.hours, status: p.status }))
      )
      setRecruitingRecords(
        records.map((r) => ({
          id: r._id,
          periodId: r.period,
          recruiterId: r.recruiter?._id || r.recruiter,
          user: r.user,
          tier: r.tier,
          score: r.score,
          days: r.days,
          hours: r.hours,
        }))
      )
      setRecruiterAdjustments(
        adjustments.map((a) => ({ periodId: a.period, recruiterId: a.recruiter, bonus: a.bonus, bonusReason: a.bonusReason, deduction: a.deduction, deductionReason: a.deductionReason }))
      )
      setManagementRows(mgmtRows.map((r) => ({ periodId: r.period, employeeId: r.employee, tierCounts: r.tierCounts, bonus: r.bonus, deduction: r.deduction })))
      setItRows(itR.map((r) => ({ periodId: r.period, employeeId: r.employee, tierCounts: r.tierCounts, bonus: r.bonus, deduction: r.deduction })))
    } catch (err) {
      setError(err.message)
    }
  }, [])

  useEffect(() => {
    if (currentPeriodId) loadPeriodData(currentPeriodId)
  }, [currentPeriodId, loadPeriodData])

  const state = {
    settings,
    periods,
    currentPeriodId,
    streamers,
    recruiters,
    managementEmployees,
    itEmployees,
    streamerPerformance,
    recruitingRecords,
    recruiterAdjustments,
    managementRows,
    itRows,
  }

  const api_ = useMemo(() => ({
    state,
    loading,
    error,

    setCurrentPeriod: (id) => setCurrentPeriodIdState(id),

    addPeriod: async (label) => {
      const p = await api.post('/periods', { label })
      setPeriods((prev) => [...prev, normId(p)])
      setCurrentPeriodIdState(p._id)
    },
    closePeriod: async (id) => {
      const p = await api.patch(`/periods/${id}/close`)
      setPeriods((prev) => prev.map((x) => (x.id === id ? normId(p) : x)))
    },

    updateSettings: async (patch) => {
      const s = await api.patch('/settings', patch)
      setSettings(s)
    },
    updateStreamerRules: async (patch) => {
      const s = await api.patch('/settings', { streamerRules: { ...settings.streamerRules, ...patch } })
      setSettings(s)
    },
    updateTierAmounts: async (patch) => {
      const s = await api.patch('/settings', { tierAmounts: { ...settings.tierAmounts, ...patch } })
      setSettings(s)
    },

    addStreamer: async (name) => {
      const s = await api.post('/streamers', { name })
      setStreamers((prev) => [...prev, normId(s)])
    },
    updateStreamer: async (id, patch) => {
      const s = await api.patch(`/streamers/${id}`, patch)
      setStreamers((prev) => prev.map((x) => (x.id === id ? normId(s) : x)))
    },
    removeStreamer: async (id) => {
      await api.del(`/streamers/${id}`)
      setStreamers((prev) => prev.filter((x) => x.id !== id))
      setStreamerPerformance((prev) => prev.filter((x) => x.streamerId !== id))
    },

    upsertPerformance: async (periodId, streamerId, patch) => {
      const current = streamerPerformance.find((x) => x.periodId === periodId && x.streamerId === streamerId) || { score: 0, days: 0, hours: 0, status: 'active' }
      const merged = { ...current, ...patch }
      await api.put(`/streamers/performance/${periodId}/${streamerId}`, merged)
      setStreamerPerformance((prev) => {
        const exists = prev.some((x) => x.periodId === periodId && x.streamerId === streamerId)
        if (exists) return prev.map((x) => (x.periodId === periodId && x.streamerId === streamerId ? { ...x, ...patch } : x))
        return [...prev, { periodId, streamerId, ...merged }]
      })
    },

    addRecruiter: async (name) => {
      const r = await api.post('/recruiters', { name })
      setRecruiters((prev) => [...prev, normId(r)])
    },
    removeRecruiter: async (id) => {
      await api.del(`/recruiters/${id}`)
      setRecruiters((prev) => prev.filter((x) => x.id !== id))
      setRecruitingRecords((prev) => prev.filter((x) => x.recruiterId !== id))
    },

    addRecruitingRecord: async (periodId, record) => {
      const r = await api.post(`/recruiting-records/${periodId}`, {
        recruiter: record.recruiterId,
        user: record.user,
        tier: record.tier,
        score: record.score,
        days: record.days,
        hours: record.hours,
      })
      setRecruitingRecords((prev) => [
        ...prev,
        { id: r._id, periodId: r.period, recruiterId: r.recruiter, user: r.user, tier: r.tier, score: r.score, days: r.days, hours: r.hours },
      ])
    },
    removeRecruitingRecord: async (recordId) => {
      await api.del(`/recruiting-records/${currentPeriodId}/${recordId}`)
      setRecruitingRecords((prev) => prev.filter((x) => x.id !== recordId))
    },

    upsertRecruiterAdjustment: async (periodId, recruiterId, patch) => {
      const current = recruiterAdjustments.find((x) => x.periodId === periodId && x.recruiterId === recruiterId) || { bonus: 0, deduction: 0 }
      const merged = { ...current, ...patch }
      await api.put(`/recruiters/adjustments/${periodId}/${recruiterId}`, merged)
      setRecruiterAdjustments((prev) => {
        const exists = prev.some((x) => x.periodId === periodId && x.recruiterId === recruiterId)
        if (exists) return prev.map((x) => (x.periodId === periodId && x.recruiterId === recruiterId ? { ...x, ...patch } : x))
        return [...prev, { periodId, recruiterId, ...merged }]
      })
    },

    addStaff: async (dept, name) => {
      const e = await api.post(`/employees/${dept}`, { name })
      if (dept === 'management') setManagementEmployees((prev) => [...prev, normId(e)])
      else setItEmployees((prev) => [...prev, normId(e)])
    },
    removeStaff: async (dept, id) => {
      await api.del(`/employees/${dept}/${id}`)
      if (dept === 'management') {
        setManagementEmployees((prev) => prev.filter((x) => x.id !== id))
        setManagementRows((prev) => prev.filter((x) => x.employeeId !== id))
      } else {
        setItEmployees((prev) => prev.filter((x) => x.id !== id))
        setItRows((prev) => prev.filter((x) => x.employeeId !== id))
      }
    },
    upsertStaffRow: async (dept, periodId, employeeId, patch) => {
      const rows = dept === 'management' ? managementRows : itRows
      const setRows = dept === 'management' ? setManagementRows : setItRows
      const current = rows.find((x) => x.periodId === periodId && x.employeeId === employeeId) || {
        tierCounts: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }, bonus: 0, deduction: 0,
      }
      const merged = { ...current, ...patch, tierCounts: { ...current.tierCounts, ...(patch.tierCounts || {}) } }
      await api.put(`/employees/${dept}/rows/${periodId}/${employeeId}`, merged)
      setRows((prev) => {
        const exists = prev.some((x) => x.periodId === periodId && x.employeeId === employeeId)
        if (exists) return prev.map((x) => (x.periodId === periodId && x.employeeId === employeeId ? merged : x))
        return [...prev, { periodId, employeeId, ...merged }]
      })
    },
  }), [state, loading, error, settings, streamerPerformance, recruiterAdjustments, managementRows, itRows, currentPeriodId])

  return <PayrollContext.Provider value={api_}>{children}</PayrollContext.Provider>
}

export function usePayroll() {
  const ctx = useContext(PayrollContext)
  if (!ctx) throw new Error('usePayroll must be used inside PayrollProvider')
  return ctx
}
