import { isAdminOrAbove } from '../app/core/permissions'
import { useState } from 'react'
import { usePayroll } from '../context/PayrollContext'
import { useAuth } from '../context/AuthContext'
import { calcStreamer, formatEGP } from '../lib/calc'
import { Card, SectionHeader, Button, Input, TableCellInput, Badge } from '../components/ui'

export default function Streamers() {
  const { state, addStreamer, updateStreamer, removeStreamer, upsertPerformance } = usePayroll()
  const { user } = useAuth()
  const isAdmin = isAdminOrAbove(user?.role)
  const { settings, currentPeriodId } = state
  const [newName, setNewName] = useState('')
  const period = state.periods.find((p) => p.id === currentPeriodId)
  const locked = period?.status === 'closed'

  const rows = state.streamers.map((st) => {
    const perf = state.streamerPerformance.find((p) => p.periodId === currentPeriodId && p.streamerId === st.id)
    const result = calcStreamer(perf, st, settings.streamerRules, settings.egpConversionRate)
    return { streamer: st, perf: perf || { score: 0, days: 0, hours: 0, status: 'active' }, result }
  })

  return (
    <div>
      <SectionHeader
        title="الستريمرز"
        subtitle="الأداء (Score / Days / Hours) خاص بالفترة الحالية — الـ Rate والبونص والخصم بيانات ثابتة للستريمر"
        action={
          !locked && isAdmin && (
            <div className="flex items-center gap-2">
              <Input placeholder="اسم الستريمر الجديد" value={newName} onChange={(e) => setNewName(e.target.value)} className="w-48" />
              <Button
                onClick={() => {
                  if (newName.trim()) {
                    addStreamer(newName.trim())
                    setNewName('')
                  }
                }}
              >
                + إضافة ستريمر
              </Button>
            </div>
          )
        }
      />

      <Card className="overflow-x-auto">
        <table className="w-full text-sm min-w-[1400px]">
          <thead>
            <tr className="border-b border-base-700 text-ink-500 text-xs">
              <th className="text-right font-medium px-4 py-3 sticky right-0 bg-base-900">الاسم</th>
              <th className="text-right font-medium px-4 py-3">Score</th>
              <th className="text-right font-medium px-4 py-3">Days</th>
              <th className="text-right font-medium px-4 py-3">Hours</th>
              <th className="text-right font-medium px-4 py-3">Total %</th>
              <th className="text-right font-medium px-4 py-3">Total Score</th>
              <th className="text-right font-medium px-4 py-3">Rate</th>
              <th className="text-right font-medium px-4 py-3">Cash</th>
              <th className="text-right font-medium px-4 py-3">بونص</th>
              <th className="text-right font-medium px-4 py-3">خصم</th>
              <th className="text-right font-medium px-4 py-3">الإجمالي</th>
              <th className="text-right font-medium px-4 py-3">EGP</th>
              <th className="text-right font-medium px-4 py-3">الحالة</th>
              {!locked && isAdmin && <th className="px-4 py-3"></th>}
            </tr>
          </thead>
          <tbody>
            {rows.map(({ streamer, perf, result }) => (
              <tr key={streamer.id} className="border-b border-base-800 last:border-0 hover:bg-base-850/60">
                <td className="px-4 py-2 font-medium sticky right-0 bg-base-900">{streamer.name}</td>
                <td className="px-1 py-1">
                  <TableCellInput
                    type="number"
                    disabled={locked}
                    defaultValue={perf.score}
                    onBlur={(e) => upsertPerformance(currentPeriodId, streamer.id, { score: Number(e.target.value) })}
                  />
                </td>
                <td className="px-1 py-1">
                  <TableCellInput
                    type="number"
                    disabled={locked}
                    defaultValue={perf.days}
                    onBlur={(e) => upsertPerformance(currentPeriodId, streamer.id, { days: Number(e.target.value) })}
                  />
                </td>
                <td className="px-1 py-1">
                  <TableCellInput
                    type="number"
                    disabled={locked}
                    defaultValue={perf.hours}
                    onBlur={(e) => upsertPerformance(currentPeriodId, streamer.id, { hours: Number(e.target.value) })}
                  />
                </td>
                <td className="px-4 py-2 text-ink-300">{(result.totalPct * 100).toFixed(0)}%</td>
                <td className="px-4 py-2 text-ink-300">{result.totalScore.toLocaleString()}</td>
                <td className="px-1 py-1 w-24">
                  <TableCellInput
                    type="number"
                    step="0.01"
                    disabled={locked || !isAdmin}
                    defaultValue={streamer.rate}
                    onBlur={(e) => updateStreamer(streamer.id, { rate: Number(e.target.value) })}
                  />
                </td>
                <td className="px-4 py-2">{result.cash.toFixed(2)}</td>
                <td className="px-1 py-1 w-24">
                  <TableCellInput
                    type="number"
                    disabled={locked || !isAdmin}
                    defaultValue={streamer.bonus}
                    onBlur={(e) => updateStreamer(streamer.id, { bonus: Number(e.target.value) })}
                  />
                </td>
                <td className="px-1 py-1 w-24">
                  <TableCellInput
                    type="number"
                    disabled={locked || !isAdmin}
                    defaultValue={streamer.deduction}
                    onBlur={(e) => updateStreamer(streamer.id, { deduction: Number(e.target.value) })}
                  />
                </td>
                <td className="px-4 py-2">{result.total.toFixed(2)}</td>
                <td className="px-4 py-2 font-semibold text-gold-400">{formatEGP(result.egp)}</td>
                <td className="px-1 py-1">
                  <select
                    disabled={locked}
                    defaultValue={perf.status}
                    onChange={(e) => upsertPerformance(currentPeriodId, streamer.id, { status: e.target.value })}
                    className="bg-transparent text-xs rounded px-1 py-1 border border-transparent hover:border-base-700"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </td>
                {!locked && isAdmin && (
                  <td className="px-2 py-2">
                    <Button variant="danger" onClick={() => removeStreamer(streamer.id)}>
                      حذف
                    </Button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <p className="text-xs text-ink-700 mt-3">
        EGP = (Cash + بونص − خصم) × معامل التحويل ({settings.egpConversionRate}). المعامل قابل للتعديل من صفحة الإعدادات.
      </p>
    </div>
  )
}
