import test from 'node:test'
import assert from 'node:assert/strict'
import InventoryItem from '../src/models/InventoryItem.js'
import InventoryDelivery from '../src/models/InventoryDelivery.js'
import {quantity,nameKey} from '../src/routes/inventory.js'
import {defaultPermissions} from '../src/lib/permissionDefaults.js'

test('inventory validates quantities, normalizes names and has independent permissions',()=>{
 assert.equal(quantity('3'),3);assert.equal(nameKey('  Laptop Lenovo  '),'laptop lenovo')
 for(const value of [-1,1.5,'x',1000001])assert.throws(()=>quantity(value))
 assert.equal(defaultPermissions('EMPLOYEE').inventory,'NO_ACCESS')
 assert.equal(defaultPermissions('MANAGEMENT').inventory,'FULL_EDIT')
 assert.equal(defaultPermissions('ADMIN').inventory,'FULL_EDIT')
})

test('inventory models preserve stock and delivery lifecycle fields',()=>{
 for(const field of ['name','quantityTotal','quantityAvailable','active','createdBy'])assert.ok(InventoryItem.schema.path(field),field)
 for(const field of ['userId','itemId','itemName','quantity','status','returnedAt'])assert.ok(InventoryDelivery.schema.path(field),field)
 assert.deepEqual(InventoryDelivery.schema.path('status').enumValues,['DELIVERED','RETURNED'])
})
