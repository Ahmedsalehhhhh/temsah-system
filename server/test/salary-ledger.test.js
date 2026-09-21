import test from 'node:test'
import assert from 'node:assert/strict'
import {groupSalaries} from '../src/lib/salaryLedger.js'
test('salary ledger combines linked sources once and subtracts only active withdrawals',()=>{
 const rows=groupSalaries([{source:'employee:1',name:'A',userId:'a',dept:'it',total:8000},{source:'recruiter:2',name:'A',userId:'a',dept:'recruiters',total:1500},{source:'employee:3',name:'A',dept:'general',total:500}], [{source:'employee:1',amountMinor:100000},{source:'recruiter:2',amountMinor:50000},{source:'employee:1',amountMinor:20000,voidedAt:new Date()}]);
 assert.equal(rows.length,2);assert.equal(rows[0].total,9500);assert.equal(rows[0].withdrawn,1500);assert.equal(rows[0].remaining,8000);assert.equal(rows[1].remaining,500);
});
test('withdrawal rounding is exact in minor units and salary reduction remains visible',()=>{
 const [r]=groupSalaries([{source:'employee:1',name:'A',total:0.3}],[{source:'employee:1',amountMinor:20},{source:'employee:1',amountMinor:20}]);assert.equal(r.remaining,-0.1);
});
