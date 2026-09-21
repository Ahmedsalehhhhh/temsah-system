import test from 'node:test'
import assert from 'node:assert/strict'
import FollowUp from '../src/models/FollowUp.js'
import WorkTask from '../src/models/WorkTask.js'

test('follow-ups accept the three required workflow concepts', () => {
  const row = new FollowUp({ category: 'Management', title: 'متابعة', createdBy: '64b000000000000000000001' })
  assert.equal(row.status, 'Pending')
  assert.equal(row.updates.length, 0)
  assert.equal(row.validateSync(), undefined)
})

test('follow-ups reject unknown tabs and statuses', () => {
  const row = new FollowUp({ category: 'Other', title: 'x', status: 'Open', createdBy: '64b000000000000000000001' })
  const error = row.validateSync()
  assert.ok(error.errors.category)
  assert.ok(error.errors.status)
})

test('new task assignments start unread for the notification bell', () => {
  const row = new WorkTask({ userId: '64b000000000000000000001', assignedTo: '64b000000000000000000002', text: 'مهمة' })
  assert.equal(row.assigneeReadAt, null)
  assert.equal(row.status, 'Pending')
})
