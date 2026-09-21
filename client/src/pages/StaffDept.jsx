import { isAdminOrAbove } from '../app/core/permissions'
import { useState } from 'react'
import { usePayroll } from '../context/PayrollContext'
import { useAuth } from '../context/AuthContext'
import { calcStaff, formatEGP } from '../lib/calc'
import { Card, SectionHeader, Button, Input, TableCellInput } from '../components/ui'

export default function StaffDept({ dept, title, subtitle }) {
  const { state, addStaff, removeStaff, upsertStaffRow } = usePayroll()
  const { user } = useAuth()
  const isAdmin = isAdminOrAbove(user?.role)
  const { settings, currentPeriodId } = state
  const period = state.periods.find((p) => p.id === currentPeriodId)
  const locked = period?.status === 'closed'
  const [newName, setNewName] = useState('')

  const employees = dept === 'management' ? state.managementEmployees : state.itEmployees
  const allRows = dept === 'management' ? state.managementRows : state.itRows

  const rows = employees.map((emp) => {
    const row = allRows.find((r) => r.periodId === currentPeriodId && r.employeeId === emp.id)
    const result = calcStaff(row, settings.managementItBaseSalary, settings.tierAmounts)
    const tierCounts = row?.tierCounts || { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    return { emp, row: row || { bonus: 0, deduction: 0, tierCounts }, result }
  })

  return (
    <div>
      <SectionHeader
        title={title}
        subtitle={subtitle}
        action={
          !locked && isAdmin && (
            <div className="flex items-center gap-2">
              <Input placeholder="اسم الموظف" value={newName} onChange={(e) => setNewName(e.target.value)} className="w-44" />
              <Button
                onClick={() => {
                  if (newName.trim()) { addStaff(dept, newName.trim()); setNewName('') }
                }}
              >
                + إضافة موظف
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
              <th className="text-right font-medium px-4 py-3">أساسي</th>
              <th className="text-right font-medium px-4 py-3">T1</th>
              <th className="text-right font-medium px-4 py-3">T2</th>
              <th className="text-right font-medium px-4 py-3">T3</th>
              <th className="text-right font-medium px-4 py-3">T4</th>
              <th className="text-right font-medium px-4 py-3">T5</th>
              <th className="text-right font-medium px-4 py-3">عمولة</th>
              <th className="text-right font-medium px-4 py-3">بونص</th>
              <th className="text-right font-medium px-4 py-3">خصم</th>
              <th className="text-right font-medium px-4 py-3">الإجمالي</th>
              {!locked && isAdmin && <th className="px-4 py-3"></th>}
            </tr>
          </thead>
          <tbody>
            {rows.map(({ emp, row, result }) => (
              <tr key={emp.id} className="border-b border-base-800 last:border-0 hover:bg-base-850/60">
                <td className="px-4 py-2.5 font-medium">{emp.name}</td>
                <td className="px-4 py-2.5 text-ink-500">{formatEGP(result.baseSalary)}</td>
                {[1, 2, 3, 4, 5].map((t) => (
                  <td key={t} className="px-1 py-1 w-16">
                    <TableCellInput
                      type="number"
                      disabled={locked}
                      defaultValue={row.tierCounts[t] || 0}
                      onBlur={(e) =>
                        upsertStaffRow(dept, currentPeriodId, emp.id, { tierCounts: { [t]: Number(e.target.value) } })
                      }
                    />
                  </td>
                ))}
                <td className="px-4 py-2.5">{formatEGP(result.recruiterBonus)}</td>
                <td className="px-1 py-1 w-24">
                  <TableCellInput
                    type="number"
                    disabled={locked}
                    defaultValue={row.bonus}
                    onBlur={(e) => upsertStaffRow(dept, currentPeriodId, emp.id, { bonus: Number(e.target.value) })}
                  />
                </td>
                <td className="px-1 py-1 w-24">
                  <TableCellInput
                    type="number"
                    disabled={locked}
                    defaultValue={row.deduction}
                    onBlur={(e) => upsertStaffRow(dept, currentPeriodId, emp.id, { deduction: Number(e.target.value) })}
                  />
                </td>
                <td className="px-4 py-2.5 font-semibold text-gold-400">{formatEGP(result.total)}</td>
                {!locked && isAdmin && (
                  <td className="px-2 py-2">
                    <Button variant="danger" onClick={() => removeStaff(dept, emp.id)}>حذف</Button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <p className="text-xs text-ink-700 mt-3">
        عدّاد Tier 2 كان فيه Bug في الإكسيل الأصلي (بيتجاهل من الموظف التاني فصاعدًا) — اتصلح هنا، Tier 2 محسوب بشكل صحيح لكل الموظفين.
      </p>
    </div>
  )
}
