import { useState } from 'react'
import { usePayroll } from '../context/PayrollContext'
import { Card, SectionHeader, Button, Input, Select } from '../components/ui'

const tierLabels = { 1: 'Tier 1 — Special', 2: 'Tier 2 — Very Very Good', 3: 'Tier 3 — Very Good', 4: 'Tier 4 — Good', 5: 'Tier 5 — Rejected' }

export default function RecruitingList() {
  const { state, addRecruitingRecord, removeRecruitingRecord } = usePayroll()
  const { currentPeriodId } = state
  const period = state.periods.find((p) => p.id === currentPeriodId)
  const locked = period?.status === 'closed'

  const [form, setForm] = useState({ recruiterId: state.recruiters[0]?.id || '', user: '', tier: 3, score: '', days: '', hours: '' })

  const records = state.recruitingRecords.filter((r) => r.periodId === currentPeriodId)

  const recruiterName = (id) => state.recruiters.find((r) => r.id === id)?.name || '—'

  return (
    <div>
      <SectionHeader
        title="سجل الريكروتينج"
        subtitle="كل عملية ريكروتينج بتتسجل هنا، والـ Tier بيحدد عمولة الريكروتر أوتوماتيك في صفحة الريكروترز"
      />

      {!locked && (
        <Card className="p-4 mb-5">
          <div className="grid grid-cols-6 gap-3 items-end">
            <label className="flex flex-col gap-1.5 col-span-1">
              <span className="text-xs text-ink-500">الريكروتر</span>
              <Select value={form.recruiterId} onChange={(e) => setForm({ ...form, recruiterId: e.target.value })}>
                {state.recruiters.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </Select>
            </label>
            <label className="flex flex-col gap-1.5 col-span-2">
              <span className="text-xs text-ink-500">اسم المستخدم اللي اتسجل</span>
              <Input value={form.user} onChange={(e) => setForm({ ...form, user: e.target.value })} placeholder="username" />
            </label>
            <label className="flex flex-col gap-1.5 col-span-1">
              <span className="text-xs text-ink-500">Tier</span>
              <Select value={form.tier} onChange={(e) => setForm({ ...form, tier: Number(e.target.value) })}>
                {Object.entries(tierLabels).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </Select>
            </label>
            <label className="flex flex-col gap-1.5 col-span-1">
              <span className="text-xs text-ink-500">Score (اختياري)</span>
              <Input type="number" value={form.score} onChange={(e) => setForm({ ...form, score: e.target.value })} />
            </label>
            <Button
              onClick={() => {
                if (!form.recruiterId || !form.user.trim()) return
                addRecruitingRecord(currentPeriodId, {
                  recruiterId: form.recruiterId,
                  user: form.user.trim(),
                  tier: form.tier,
                  score: Number(form.score) || 0,
                  days: Number(form.days) || 0,
                  hours: Number(form.hours) || 0,
                })
                setForm({ ...form, user: '', score: '', days: '', hours: '' })
              }}
            >
              + إضافة سجل
            </Button>
          </div>
        </Card>
      )}

      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-base-700 text-ink-500 text-xs">
              <th className="text-right font-medium px-4 py-3">الريكروتر</th>
              <th className="text-right font-medium px-4 py-3">المستخدم</th>
              <th className="text-right font-medium px-4 py-3">Tier</th>
              <th className="text-right font-medium px-4 py-3">Score</th>
              {!locked && <th className="px-4 py-3"></th>}
            </tr>
          </thead>
          <tbody>
            {records.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-ink-700">لا يوجد سجلات في هذه الفترة بعد</td>
              </tr>
            )}
            {records.map((r) => (
              <tr key={r.id} className="border-b border-base-800 last:border-0">
                <td className="px-4 py-2.5 font-medium">{recruiterName(r.recruiterId)}</td>
                <td className="px-4 py-2.5 text-ink-300">{r.user}</td>
                <td className="px-4 py-2.5 text-ink-300">{tierLabels[r.tier]}</td>
                <td className="px-4 py-2.5 text-ink-500">{r.score || '—'}</td>
                {!locked && (
                  <td className="px-4 py-2.5">
                    <Button variant="danger" onClick={() => removeRecruitingRecord(r.id)}>حذف</Button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  )
}
