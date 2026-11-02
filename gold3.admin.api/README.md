# gold3.admin.api

Authenticated admin API for GOLDEN PACT GG. Reports what the protocol did
(settled days, positions, members, treasury flows, fees), and edits the one
thing decided off chain - the community payout queue the accountant keeper
drains. Separate from any public API on purpose: this one writes, so it gets
its own process, its own origin allowlist, and can be kept off the public
internet entirely.

## Layout

```
config/         env only - this service reads no address book
permissions.js  the permission catalogue: every key that exists
model/          sequelize connection + models
model/models/   AdminUser + AdminRole + AdminAuditLog (owned) and sync.js (mirrors)
utils/          password (scrypt), totp, session, redis, audit, address, paging
middleware/     auth (who you are) + permission (what you may do)
routes/         one router per resource
scripts/        schema + account management + the route-coverage check
bin/www         http bootstrap with graceful shutdown
```

Every async route is registered through `wrap()` from `utils/asyncRoute.js`:
express 4 does not await what a handler returns, so without it a rejected
query would take the whole service down instead of answering 500.

This service keeps **no address book and no clock mirror**. It reads rows, it
does not compute protocol time: "the current day" here is the newest day the
rows carry (`gold3_emission_days`).

## Table ownership

`gold3.sync` owns the protocol tables. This service reads them and writes
rows in exactly two - `gold3_community_queue` and `gold3_community_queue_days`
- but never creates or alters any: `model/models/sync.js` is a **mirror** of
gold3.sync's definitions and has to be updated whenever those change.

`npm run init-schema` creates only the three tables this service owns:
`gold3_admin_users`, `gold3_admin_roles`, `gold3_admin_audit_log`.

## Routes

| route | permission | what |
| --- | --- | --- |
| `GET /api/days`, `/api/days/:day` | `days.read` | settled days: budget split, holding distributed, five buckets, close, queue state |
| `GET /api/positions`, `/api/positions/holding` | `positions.read` | power positions by asset, holding reward days and claims |
| `GET /api/members`, `/api/members/:address` | `members.read` | members by power; one member across power / tier / rights / credits |
| `GET /api/treasury` | `treasury.read` | flows of the four vaults by contract, method, token and tag |
| `GET /api/fees` | `fees.read` | fee routes by source and purpose, buybacks |
| `GET /api/queues/community`, `/summary` | `queues.read` | the payout queue and its stuck batches |
| `POST /api/queues/community/enqueue` | `queues.write` (code) | enqueue a settled day's rows `{ day, rows: [{ address, bucket, amount }], note }` |
| `DELETE /api/queues/community/day/:day` | `queues.write` (code) | drop a day's pending rows |
| `POST /api/queues/community/resolve` | `queues.write` (code) | resolve a batch left `sending` by nonce |
| `POST /api/queues/community/retry` | `queues.write` (code) | requeue failed rows |
| `GET /api/services` | `services.read` | gold3.sync heartbeats and cursors from redis |
| `GET /api/audit` | `audit.read` | the audit trail |
| `/api/roles`, `/api/admin-users` | `admin.roles.*`, `admin.users.*` | panel access |

"(code)" = `danger` in `permissions.js`: the request must carry a fresh TOTP
code in `X-Totp-Code`.

## Authentication

Password + TOTP. Passwords are scrypt with per-user salt; TOTP is 6 digits,
30-second step, a code spendable exactly once; sessions are 256-bit random
bearer tokens whose SHA-256 lives in redis with a fixed TTL. Nothing uses
cookies. The account is created with no TOTP secret and its owner binds one in
the browser at first sign-in (`/api/auth/enroll`); a rebind needs
`npm run reset-totp -- <username>` on the server.

```
cp .env.sample .env
npm install
npm run init-schema
npm run create-admin -- alice     # prompts for a password; no secret printed
npm run check-permissions         # every route guarded, every key used
npm start                         # or pm2 start ecosystem.config.js
```
