import {beforeEach} from 'node:test'
import PermissionPolicy from '../src/models/PermissionPolicy.js'
import {defaultPermissions} from '../src/lib/permissionDefaults.js'
// Existing HTTP suites run without a live database, using seeded role documents.
beforeEach(t=>t.mock.method(PermissionPolicy,'findById',id=>({lean:async()=>String(id).startsWith('role:')?{entries:defaultPermissions(String(id).slice(5))}:null})))
