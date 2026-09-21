# Attendance & Work

Uses the existing Express/Mongoose API, JWT login, Angular standalone components, and Golden Streamers theme. Payroll Employee documents remain unchanged; attendance belongs to login User accounts.

## Configuration and startup

Optional `server/.env` setting:

```dotenv
ATTENDANCE_TIMEZONE=Africa/Cairo
```

The server owns timestamps and computes work dates in this IANA timezone. Set the timezone before first use and keep it stable: existing records retain their assigned work dates. An overnight shift stays attached to its check-in date; employees must close it before starting another. Daily summary hours include only the portion inside the selected business day, with DST-aware day boundaries. The dashboard refreshes every five seconds.

The existing admin is reused. For a new database, configure `DEFAULT_ADMIN_EMAIL`, `DEFAULT_ADMIN_PASSWORD`, and optionally `ATTENDANCE_ADMIN_NAME`, then run from `server`:

```powershell
node src/setup-attendance-admin.js
npm.cmd start
```

The seed hashes a new password with bcrypt cost 12, preserves an existing admin's password, and refuses to promote an unrelated existing account automatically. Credentials are never embedded in the frontend.

## Accounts and permissions

Admin manages accounts at `/employee-accounts`: add, edit, view, activate/deactivate, reset password. Account responses expose `id`, `fullName`, `email`, `role` (ADMIN/EMPLOYEE), and `status` (ACTIVE/INACTIVE), never password material.

For compatibility with existing features, User stores `admin` / `employee` internally, and legacy `staff` / `streamer` roles remain unchanged. Legacy names are presented as fullName when no separate fullName exists. Existing legacy users can use their own attendance without losing existing module permissions. Payroll Employee records are not automatically converted into login accounts or associated by matching names.

New employee accounts can access only their own attendance/history/work. Backend rejects identity fields on self-service mutations and scopes reads to the authenticated User. Admin can view all, manage accounts, and correct existing check-in/out times. Deactivation blocks existing sessions immediately; activation does not revive revoked sessions. Password reset invalidates existing tokens. Admin cannot deactivate or demote their own account. After bootstrap, `/auth/register` requires an authenticated admin, preventing employee self-registration into a legacy staff role.

## Storage and corrections

`Attendance` contains userId, workDate, checkIn/checkOut, open-state, work-update subdocuments and append-only audit entries. Unique indexes enforce `(userId, workDate)` and at most one open shift per user. Index creation is awaited at server startup.

Updates store text, status, and server createdAt; no surveillance data is collected. Daily updates require an attendance record and are limited to 1,000 per record. Work duration is derived from server timestamps, not client input.

Corrections require ADMIN, a reason, explicit timezone-bearing ISO timestamps and the current revision. The backend validates date/order/future times and overlapping shifts. An optimistic revision check rejects stale corrections. Changed By, Changed At, Old Value and New Value are embedded in the same atomic MongoDB update as the correction, so no unaudited successful correction is possible. Employees cannot write audits or change attendance timestamps.

Attendance History lists recorded days (days without attendance appear as Not Started on the admin daily dashboard). Active non-admin accounts plus inactive accounts with attendance on the selected day appear in the dashboard. Search/status filter table rows; date/employee selections also determine the summary.

## API

All routes require the existing Bearer JWT.

- `GET /api/attendance/today`
- `POST /api/attendance/check-in` and `/check-out` with `{}`
- `POST /api/attendance/updates` with `{text,status}`
- `GET /api/attendance/history?from=&to=&employee=&status=&page=` (employee filter: admin only)
- `GET /api/attendance/dashboard?date=&employee=&search=&status=` (admin)
- `GET /api/attendance/:id` (owner or admin)
- `PATCH /api/attendance/:id/correction` with `{checkIn,checkOut,reason,revision}` (admin)
- `GET/POST /api/employee-accounts` (admin)
- `GET/PATCH /api/employee-accounts/:id` (admin)
- `POST /api/employee-accounts/:id/reset-password` with `{temporaryPassword}` (admin)

## Verification

```powershell
# In server:
npm.cmd test
# Live integration: set DEFAULT_ADMIN_EMAIL and DEFAULT_ADMIN_PASSWORD in your process environment.
node src/verify-attendance.js
# In client:
npm.cmd run build
```

The live verifier creates two uniquely named temporary employees, exercises real DB writes/reads, concurrent check-in/out, work updates, account reset/deactivation, history isolation, corrections/audits and constraints. Its finally block removes only generated test employees and their attendance. It does not modify existing employee attendance.
