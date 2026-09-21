import { usePayroll } from '../context/PayrollContext'
import { Card, SectionHeader, Field, Input, Select } from '../components/ui'

export default function SettingsPage() {
  const { state, updateSettings, updateStreamerRules, updateTierAmounts } = usePayroll()
  const { settings } = state
  const rules = settings.streamerRules

  return (
    <div className="max-w-3xl">
      <SectionHeader
        title="الإعدادات"
        subtitle="القواعد المستخرجة من الإكسيل الأصلي — قابلة للتعديل هنا بدل ما تتقفل في الكود"
      />

      <div className="grid gap-5">
        <Card className="p-5">
          <h3 className="font-display text-sm font-semibold text-ink-100 mb-4">عام</h3>
          <div className="grid grid-cols-2 gap-4">
            <Field label="معامل تحويل EGP (كان B4 في الإكسيل)" hint="EGP = (Cash + بونص − خصم) × المعامل">
              <Input
                type="number"
                defaultValue={settings.egpConversionRate}
                onBlur={(e) => updateSettings({ egpConversionRate: Number(e.target.value) })}
              />
            </Field>
            <Field label="الراتب الأساسي — الإدارة و IT">
              <Input
                type="number"
                defaultValue={settings.managementItBaseSalary}
                onBlur={(e) => updateSettings({ managementItBaseSalary: Number(e.target.value) })}
              />
            </Field>
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="font-display text-sm font-semibold text-ink-100 mb-4">قيم الـ Tiers (عمولة التوظيف)</h3>
          <div className="grid grid-cols-5 gap-3">
            {[1, 2, 3, 4, 5].map((t) => (
              <Field key={t} label={`Tier ${t}`}>
                <Input
                  type="number"
                  defaultValue={settings.tierAmounts[t]}
                  onBlur={(e) => updateTierAmounts({ [t]: Number(e.target.value) })}
                />
              </Field>
            ))}
          </div>
          <p className="text-[11px] text-ink-700 mt-3">
            Tier 1 = Special · Tier 2 = Very Very Good · Tier 3 = Very Good · Tier 4 = Good · Tier 5 = Rejected
          </p>
        </Card>

        <Card className="p-5">
          <h3 className="font-display text-sm font-semibold text-ink-100 mb-4">قواعد أداء الستريمرز</h3>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <div className="text-xs text-gold-400 mb-3">Standard</div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Score الحد الأدنى">
                  <Input type="number" defaultValue={rules.standard.score} onBlur={(e) => updateStreamerRules({ standard: { ...rules.standard, score: Number(e.target.value) } })} />
                </Field>
                <Field label="Days الحد الأدنى">
                  <Input type="number" defaultValue={rules.standard.days} onBlur={(e) => updateStreamerRules({ standard: { ...rules.standard, days: Number(e.target.value) } })} />
                </Field>
                <Field label="Hours الحد الأدنى">
                  <Input type="number" defaultValue={rules.standard.hours} onBlur={(e) => updateStreamerRules({ standard: { ...rules.standard, hours: Number(e.target.value) } })} />
                </Field>
                <Field label="النسبة %">
                  <Input type="number" step="0.01" defaultValue={rules.standard.pct} onBlur={(e) => updateStreamerRules({ standard: { ...rules.standard, pct: Number(e.target.value) } })} />
                </Field>
              </div>
            </div>
            <div>
              <div className="text-xs text-gold-400 mb-3">Extra</div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Score الحد الأدنى">
                  <Input type="number" defaultValue={rules.extra.score} onBlur={(e) => updateStreamerRules({ extra: { ...rules.extra, score: Number(e.target.value) } })} />
                </Field>
                <Field label="Days الحد الأدنى">
                  <Input type="number" defaultValue={rules.extra.days} onBlur={(e) => updateStreamerRules({ extra: { ...rules.extra, days: Number(e.target.value) } })} />
                </Field>
                <Field label="Hours الحد الأدنى">
                  <Input type="number" defaultValue={rules.extra.hours} onBlur={(e) => updateStreamerRules({ extra: { ...rules.extra, hours: Number(e.target.value) } })} />
                </Field>
                <Field label="النسبة %">
                  <Input type="number" step="0.01" defaultValue={rules.extra.pct} onBlur={(e) => updateStreamerRules({ extra: { ...rules.extra, pct: Number(e.target.value) } })} />
                </Field>
              </div>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-base-800">
            <Field label="الـ Rate الافتراضي لأي ستريمر جديد ملوش Rate">
              <Input
                type="number"
                step="0.01"
                defaultValue={rules.defaultRate}
                onBlur={(e) => updateStreamerRules({ defaultRate: Number(e.target.value) })}
                className="w-40"
              />
            </Field>
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="font-display text-sm font-semibold text-ink-100 mb-4">طريقة حساب Tier في الإدارة / IT</h3>
          <div className="grid grid-cols-2 gap-4">
            <Field label="الإدارة" hint="يدوي = زي الإكسيل الأصلي · تلقائي = من سجل الريكروتينج">
              <Select defaultValue={settings.managementTierMode} onChange={(e) => updateSettings({ managementTierMode: e.target.value })}>
                <option value="manual">يدوي</option>
                <option value="auto" disabled>تلقائي (قريبًا)</option>
              </Select>
            </Field>
            <Field label="IT">
              <Select defaultValue={settings.itTierMode} onChange={(e) => updateSettings({ itTierMode: e.target.value })}>
                <option value="manual">يدوي</option>
                <option value="auto" disabled>تلقائي (قريبًا)</option>
              </Select>
            </Field>
          </div>
        </Card>
      </div>
    </div>
  )
}
