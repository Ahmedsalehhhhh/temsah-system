// ============================================================
// Golden Streamers Payroll — Business Logic Engine
// Reverse-engineered from Base.xlsx, verified formula-by-formula,
// with the Excel's known bugs fixed rather than reproduced:
//   1. Management/IT: Tier 2 term was missing from row 11 onward
//      in the original sheet. Fixed here — always included.
//   2. Rate lookup is a fraction (0.62 = 62%), used as such.
// ============================================================

export const clampNum = (v) => {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

/**
 * Streamer performance calculation.
 * perf: { score, days, hours }
 * profile: { rate, bonus, deduction } (from Streamer master data / Name & Rates)
 * rules: settings.streamerRules
 * conversionRate: settings.egpConversionRate (Excel's B4)
 */
export function calcStreamer(perf, profile, rules, conversionRate) {
  const score = clampNum(perf?.score)
  const days = clampNum(perf?.days)
  const hours = clampNum(perf?.hours)
  const rate = profile?.rate ?? rules.defaultRate
  const bonus = clampNum(profile?.bonus)
  const deduction = clampNum(profile?.deduction)

  const std = rules.standard
  const ext = rules.extra

  const meetsStandard = days >= std.days && hours >= std.hours
  const meetsScoreFloor = score >= std.score
  const meetsExtra = days >= ext.days && hours >= ext.hours && score >= ext.score

  const scorePct = meetsStandard && meetsScoreFloor ? std.pct : 0
  const scoreAmt = meetsScoreFloor ? score * std.pct : 0
  const daysPct = meetsStandard ? std.pct : 0
  const daysAmt = meetsStandard ? score * std.pct : 0
  const extraAmt = meetsExtra ? score * ext.pct : 0
  const extraPct = meetsExtra ? ext.pct : 0

  const totalPct = scorePct + daysPct + extraPct
  const totalScore = totalPct * score
  const cash = (totalScore / 100) * rate

  const total = cash + bonus - deduction
  const egp = total * conversionRate

  return {
    score, days, hours,
    scorePct, scoreAmt, daysPct, daysAmt, extraAmt, extraPct,
    rate, totalPct, totalScore, cash, bonus, deduction, total, egp,
  }
}

/**
 * Recruiter commission calculation.
 * records: recruiting-list rows belonging to this recruiter, each { tier: 1..5 }
 * tierAmounts: settings.tierAmounts, e.g. {1:0, 2:1500, 3:1000, 4:500, 5:0}
 * adjustment: { bonus, deduction } manual, per period
 */
export function calcRecruiter(records, tierAmounts, adjustment) {
  const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  for (const r of records) {
    const t = clampNum(r.tier)
    if (counts[t] !== undefined) counts[t] += 1
  }
  const amount =
    counts[1] * tierAmounts[1] +
    counts[2] * tierAmounts[2] +
    counts[3] * tierAmounts[3] +
    counts[4] * tierAmounts[4] +
    counts[5] * tierAmounts[5]

  const bonus = clampNum(adjustment?.bonus)
  const deduction = clampNum(adjustment?.deduction)
  const total = amount + bonus - deduction

  return { counts, amount, bonus, deduction, total }
}

/**
 * Management / IT employee calculation.
 * row: { tierCounts: {1..5}, bonus, deduction }
 * baseSalary: settings.managementItBaseSalary (Excel's 8000)
 * tierAmounts: settings.tierAmounts
 * NOTE: unlike the original Excel, Tier 2 is always included (bug fixed).
 */
export function calcStaff(row, baseSalary, tierAmounts) {
  const counts = row?.tierCounts || {}
  const recruiterBonus =
    clampNum(counts[1]) * tierAmounts[1] +
    clampNum(counts[2]) * tierAmounts[2] +
    clampNum(counts[3]) * tierAmounts[3] +
    clampNum(counts[4]) * tierAmounts[4] +
    clampNum(counts[5]) * tierAmounts[5]

  const bonus = clampNum(row?.bonus)
  const deduction = clampNum(row?.deduction)
  const total = baseSalary + recruiterBonus + bonus - deduction

  return { recruiterBonus, bonus, deduction, total, baseSalary }
}

export function formatEGP(n) {
  const v = clampNum(n)
  return v.toLocaleString('en-US', { maximumFractionDigits: 2 }) + ' EGP'
}
