import { usePayroll } from '../context/PayrollContext'
import { calcStreamer, calcRecruiter, calcStaff, formatEGP } from '../lib/calc'
import { Card, SectionHeader, StatCard, Badge } from '../components/ui'

export default function Overview() {
  const { state } = usePayroll()
  const { settings, currentPeriodId } = state
  const period = state.periods.find((p) => p.id === currentPeriodId)

  // Streamers
  const streamerResults = state.streamers.map((st) => {
    const perf = state.streamerPerformance.find((p) => p.periodId === currentPeriodId && p.streamerId === st.id)
    const r = calcStreamer(perf, st, settings.streamerRules, settings.egpConversionRate)
    return { ...st, ...r }
  })
  const streamersBase = streamerResults.reduce((sum, s) => sum + s.cash * settings.egpConversionRate, 0)
  const streamersBonus = streamerResults.reduce((sum, s) => sum + s.bonus * settings.egpConversionRate, 0)
  const streamersDeduction = streamerResults.reduce((sum, s) => sum + s.deduction * settings.egpConversionRate, 0)
  const streamersTotal = streamersBase + streamersBonus - streamersDeduction

  // Recruiters
  const recruiterResults = state.recruiters.map((rc) => {
    const records = state.recruitingRecords.filter((r) => r.periodId === currentPeriodId && r.recruiterId === rc.id)
    const adj = state.recruiterAdjustments.find((a) => a.periodId === currentPeriodId && a.recruiterId === rc.id)
    const r = calcRecruiter(records, settings.tierAmounts, adj)
    return { ...rc, ...r }
  })
  const recruitersBase = recruiterResults.reduce((sum, r) => sum + r.amount, 0)
  const recruitersBonus = recruiterResults.reduce((sum, r) => sum + r.bonus, 0)
  const recruitersDeduction = recruiterResults.reduce((sum, r) => sum + r.deduction, 0)
  const recruitersTotal = recruitersBase + recruitersBonus - recruitersDeduction

  // Management
  const mgmtResults = state.managementEmployees.map((emp) => {
    const row = state.managementRows.find((r) => r.periodId === currentPeriodId && r.employeeId === emp.id)
    const r = calcStaff(row, settings.managementItBaseSalary, settings.tierAmounts)
    return { ...emp, ...r }
  })
  const mgmtBase = mgmtResults.reduce((sum, r) => sum + r.baseSalary, 0)
  const mgmtBonus = mgmtResults.reduce((sum, r) => sum + r.recruiterBonus + r.bonus, 0)
  const mgmtDeduction = mgmtResults.reduce((sum, r) => sum + r.deduction, 0)
  const mgmtTotal = mgmtBase + mgmtBonus - mgmtDeduction

  // IT
  const itResults = state.itEmployees.map((emp) => {
    const row = state.itRows.find((r) => r.periodId === currentPeriodId && r.employeeId === emp.id)
    const r = calcStaff(row, settings.managementItBaseSalary, settings.tierAmounts)
    return { ...emp, ...r }
  })
  const itBase = itResults.reduce((sum, r) => sum + r.baseSalary, 0)
  const itBonus = itResults.reduce((sum, r) => sum + r.recruiterBonus + r.bonus, 0)
  const itDeduction = itResults.reduce((sum, r) => sum + r.deduction, 0)
  const itTotal = itBase + itBonus - itDeduction

  const companyTotal = streamersTotal + recruitersTotal + mgmtTotal + itTotal
  const employeeCount = state.streamers.length + state.recruiters.length + state.managementEmployees.length + state.itEmployees.length

  const rows = [
    { name: 'الستريمرز', base: streamersBase, bonus: streamersBonus, deduction: streamersDeduction, total: streamersTotal, count: state.streamers.length },
    { name: 'الريكروترز', base: recruitersBase, bonus: recruitersBonus, deduction: recruitersDeduction, total: recruitersTotal, count: state.recruiters.length },
    { name: 'الإدارة', base: mgmtBase, bonus: mgmtBonus, deduction: mgmtDeduction, total: mgmtTotal, count: state.managementEmployees.length },
    { name: 'IT', base: itBase, bonus: itBonus, deduction: itDeduction, total: itTotal, count: state.itEmployees.length },
  ]

  return (
    <div>
      <SectionHeader
        title="نظرة عامة على الرواتب"
        subtitle={`فترة الرواتب: ${period?.label ?? '—'}`}
        action={period?.status === 'closed' ? <Badge tone="bad">فترة مقفولة</Badge> : <Badge tone="good">فترة مفتوحة</Badge>}
      />

      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard label="إجمالي الرواتب" value={formatEGP(companyTotal)} tone="gold" />
        <StatCard label="عدد الموظفين" value={employeeCount} />
        <StatCard label="إجمالي البونص" value={formatEGP(streamersBonus + recruitersBonus + mgmtBonus + itBonus)} tone="good" />
        <StatCard label="إجمالي الخصومات" value={formatEGP(streamersDeduction + recruitersDeduction + mgmtDeduction + itDeduction)} tone="bad" />
      </div>

      <Card>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-base-700 text-ink-500 text-xs">
              <th className="text-right font-medium px-5 py-3">القسم</th>
              <th className="text-right font-medium px-5 py-3">عدد الموظفين</th>
              <th className="text-right font-medium px-5 py-3">الأساسي</th>
              <th className="text-right font-medium px-5 py-3">البونص</th>
              <th className="text-right font-medium px-5 py-3">الخصومات</th>
              <th className="text-right font-medium px-5 py-3">الإجمالي</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.name} className="border-b border-base-800 last:border-0">
                <td className="px-5 py-3 font-medium">{r.name}</td>
                <td className="px-5 py-3 text-ink-500">{r.count}</td>
                <td className="px-5 py-3">{formatEGP(r.base)}</td>
                <td className="px-5 py-3 text-good">{formatEGP(r.bonus)}</td>
                <td className="px-5 py-3 text-bad">{r.deduction ? '- ' + formatEGP(r.deduction) : formatEGP(0)}</td>
                <td className="px-5 py-3 font-semibold text-gold-400">{formatEGP(r.total)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-base-850">
              <td className="px-5 py-3 font-semibold">الإجمالي الكلي</td>
              <td className="px-5 py-3 text-ink-500">{employeeCount}</td>
              <td className="px-5 py-3">{formatEGP(rows.reduce((s, r) => s + r.base, 0))}</td>
              <td className="px-5 py-3 text-good">{formatEGP(rows.reduce((s, r) => s + r.bonus, 0))}</td>
              <td className="px-5 py-3 text-bad">{formatEGP(rows.reduce((s, r) => s + r.deduction, 0))}</td>
              <td className="px-5 py-3 font-semibold text-gold-400">{formatEGP(companyTotal)}</td>
            </tr>
          </tfoot>
        </table>
      </Card>
    </div>
  )
}
