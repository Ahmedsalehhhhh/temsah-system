export const clampNum = (v) => {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

export function calcStreamer(perf, profile, rules, conversionRate) {
  const score = clampNum(perf?.score)
  const days = clampNum(perf?.days)
  const hours = clampNum(perf?.hours)
  const rate = profile?.rate ?? rules.defaultRate
  const bonus = clampNum(perf?.bonus)
  const deduction = clampNum(perf?.deduction)

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

export function calcStaff(row, baseSalary, tierBonus = 0) {
  const bonus = clampNum(row?.bonus)
  const deduction = clampNum(row?.deduction)
  return { baseSalary: clampNum(baseSalary), recruiterBonus: clampNum(tierBonus), bonus, deduction, total: clampNum(baseSalary) + clampNum(tierBonus) + bonus - deduction }
}
