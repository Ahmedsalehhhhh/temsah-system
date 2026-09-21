import { isAdminOrAbove } from '../app/core/permissions'
import { useState } from 'react'
import { usePayroll } from '../context/PayrollContext'
import { useAuth } from '../context/AuthContext'
import { calcRecruiter, formatEGP } from '../lib/calc'
import { Card, SectionHeader, Button, Input, TableCellInput } from '../components/ui'

export default function Recruiters() {
  const { state, addRecruiter, removeRecruiter, upsertRecruiterAdjustment } = usePayroll()
  const { user } = useAuth()
  const isAdmin = isAdminOrAbove(user?.role)
  const { settings, currentPeriodId } = state
  const period = state.periods.find((p) => p.id === currentPeriodId)
  const locked = period?.status === 'closed'
  const [newName, setNewName] = useState('')

  const rows = state.recruiters.map((rc) => {
    const records = state.recruitingRecords.filter((r) => r.periodId === currentPeriodId && r.recruiterId === rc.id)
    const adj = state.recruiterAdjustments.find((a) => a.periodId === currentPeriodId && a.recruiterId === rc.id)
    const result = calcRecruiter(records, settings.tierAmounts, adj)
    return { recruiter: rc, adj: adj || { bonus: 0, deduction: 0 }, result }
  })

  return (
    <div>
      <SectionHeader
        title="الريكروترز"
        subtitle="عدد كل Tier بيتحسب أوتوماتيك من سجل الريكروتينج للفترة الحالية"
        action={
          !locked && isAdmin && (
            <div className="flex items-center gap-2">
              <Input placeholder="اسم الريكروتر" value={newName} onChange={(e) => setNewName(e.target.value)} className="w-44" />
              <Button
                onClick={() => {
                  if (newName.trim()) { addRecruiter(newName.trim()); setNewName('') }
                }}
              >
                + إضافة ريكروتر
              </Button>
            </div>
          )
        }
      />

      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-base-700 text-ink-500 text-xs">
              <th className="text-right font-medium px-4 py-3">الاسم</th>
              <th className="text-right font-medium px-4 py-3">T1</th>
              <th className="text-right font-medium px-4 py-3">T2</th>
              <th className="text-right font-medium px-4 py-3">T3</th>
              <th className="text-right font-medium px-4 py-3">T4</th>
              <th className="text-right font-medium px-4 py-3">T5</th>
              <th className="text-right font-medium px-4 py-3">عمولة التوظيف</th>
              <th className="text-right font-medium px-4 py-3">بونص</th>
              <th className="text-right font-medium px-4 py-3">خصم</th>
              <th className="text-right font-medium px-4 py-3">الإجمالي</th>
              {!locked && isAdmin && <th className="px-4 py-3"></th>}
            </tr>
          </thead>
          <tbody>
            {rows.map(({ recruiter, adj, result }) => (
              <tr key={recruiter.id} className="border-b border-base-800 last:border-0 hover:bg-base-850/60">
                <td className="px-4 py-2.5 font-medium">{recruiter.name}</td>
                <td className="px-4 py-2.5 text-ink-500">{result.counts[1]}</td>
                <td className="px-4 py-2.5 text-ink-500">{result.counts[2]}</td>
                <td className="px-4 py-2.5 text-ink-500">{result.counts[3]}</td>
                <td className="px-4 py-2.5 text-ink-500">{result.counts[4]}</td>
                <td className="px-4 py-2.5 text-ink-500">{result.counts[5]}</td>
                <td className="px-4 py-2.5">{formatEGP(result.amount)}</td>
                <td className="px-1 py-1 w-24">
                  <TableCellInput
                    type="number"
                    disabled={locked}
                    defaultValue={adj.bonus}
                    onBlur={(e) => upsertRecruiterAdjustment(currentPeriodId, recruiter.id, { bonus: Number(e.target.value) })}
                  />
                </td>
                <td className="px-1 py-1 w-24">
                  <TableCellInput
                    type="number"
                    disabled={locked}
                    defaultValue={adj.deduction}
                    onBlur={(e) => upsertRecruiterAdjustment(currentPeriodId, recruiter.id, { deduction: Number(e.target.value) })}
                  />
                </td>
                <td className="px-4 py-2.5 font-semibold text-gold-400">{formatEGP(result.total)}</td>
                {!locked && isAdmin && (
                  <td className="px-2 py-2">
                    <Button variant="danger" onClick={() => removeRecruiter(recruiter.id)}>حذف</Button>
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
