import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { calcStreamer, calcRecruiter, calcStaff } from '../src/lib/calc.js'
const rules = { defaultRate: .5, standard: { score: 150000, days: 20, hours: 60, pct: .03 }, extra: { score: 150000, days: 22, hours: 100, pct: .02 } }
const tiers = { 1: 0, 2: 1500, 3: 1000, 4: 500, 5: 0 }
test('Excel Streamers E:T: threshold cases and bonus conversion', () => {
  for (const [score,days,hours,pct,cash] of [
    [150000,20,60,.06,45], [150000,22,100,.08,60],
    [150000,19,100,0,0], [149999,22,100,.03,22.49985],
    [150000,22,99,.06,45], [150000,22,59,0,0], [0,0,0,0,0],
  ]) {
    const r = calcStreamer({score,days,hours,bonus:10,deduction:3}, undefined, rules, 50)
    assert.equal(r.totalPct,pct)
    assert.ok(Math.abs(r.cash-cash)<1e-9)
    assert.ok(Math.abs(r.egp-(cash+7)*50)<1e-8)
  }
  const scoreOnly = calcStreamer({score:150000,days:0,hours:0}, undefined,rules,50)
  assert.equal(scoreOnly.scoreAmt,4500) // F15 is independent of attendance; E15 is not.
  assert.equal(scoreOnly.scorePct,0)
  assert.equal(calcStreamer({score:150000,days:22,hours:100},{rate:.62},rules,50).cash,74.4)
  assert.equal(calcStreamer({score:150000,days:22,hours:100},{rate:0},rules,50).cash,0)
})
test('recruiter COUNTIFS tiers and staff salary reconciliation without admin tier fields', () => {
  assert.equal(calcRecruiter([{tier:2},{tier:2},{tier:3},{tier:4},{tier:5}],tiers,{bonus:100,deduction:50}).total,4550)
  assert.equal(calcStaff({tierCounts:{2:2,3:1,4:1},bonus:100,deduction:50},8000,tiers).total,8050)
})
test('Angular and API calculators agree across input combinations', () => {
  const require = createRequire(import.meta.url)
  const ts = require('../../client/node_modules/typescript')
  const source = readFileSync(new URL('../../client/src/app/core/calc.ts', import.meta.url),'utf8')
  const compiled = ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText
  const exports = {}; new Function('exports',compiled)(exports)
  for (const score of [0,149999,150000,350000])
    for (const days of [0,19,20,22])
      for (const hours of [0,59,60,100]) {
        const perf = {score,days,hours,bonus:12,deduction:7}
        assert.deepEqual(exports.calcStreamer(perf,{rate:.62},rules,50),calcStreamer(perf,{rate:.62},rules,50))
      }
  assert.deepEqual(exports.calcStaff({tierCounts:{2:2},bonus:10},8000,tiers),calcStaff({tierCounts:{2:2},bonus:10},8000,tiers))
  for(const records of [[],[{tier:2}],[{tier:2},{tier:3}],[{tier:4}]]){
    const amount=calcRecruiter(records,tiers).amount;
    const expected=8000+amount+100-50;
    assert.equal(calcStaff({bonus:100,deduction:50},8000,amount).total,expected);
    assert.deepEqual(exports.calcStaff({bonus:100,deduction:50},8000,amount),calcStaff({bonus:100,deduction:50},8000,amount));
  }
})
