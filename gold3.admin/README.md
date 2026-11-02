# gold3.admin

The operator panel for GOLDEN PACT GG. Talks to `gold3.admin.api`; it holds no
chain logic and no private keys of its own — the contract pages hand a
transaction to the operator's browser wallet and that wallet signs it.

## The layout

```
src/
  api/client.js          fetch wrapper, session token, 401 handling, error copy
  auth/AuthContext.jsx   session state, can(permission)
  auth/permissions.js    zh-TW names for the API's permission keys
  nav.js                 the sidebar, and the landing redirect's source of truth
  theme.js               the gold brand ramp, greys, MONO
  hooks/useResource.js   load / error / reload against the API
  hooks/useChainRead.js  the same, against the RPC
  chain/client.js        read-only provider + the synced address book
  chain/contracts.js     CONTRACTS: address + ABI + declared roles per contract
  chain/wallet.jsx       wallet connection, explorer links, shorten()
  chain/TxContext.jsx    one confirm-then-send path for every transaction
  components/            Layout, Section, Guarded, ConfirmDialog, TotpProvider,
                         TxButton, ContractCard
  pages/                 one file per screen (Days, Positions, Members,
                         Treasury, Fees, Queues, Services, Audit, Operators, Roles)
  pages/contracts/       one file per contract group (these sign, they never
                         call the API)
  assets/                generated: addresses.json, abi/*.json
```

## Running

```
cp .env.sample .env.local
npm install
npm run sync-addresses   # after every deploy that changes an address
npm run sync-abi         # after every contract change (needs compiled artifacts)
npm run dev              # :5300, proxies /api to VITE_API_PROXY (default :3300)
npm run build            # -> dist/, served by nginx next to the admin API
```

Chain reads do not go through the API at all — they run in the browser against
`VITE_RPC_URL`. The block of the address book the panel signs against is fixed
at build time by `VITE_NETWORK` (`anubis` unless set).

## Keeping the contract copies current

The contract pages read and sign against `src/assets/addresses.json` and
`src/assets/abi/*.json`, build-time copies of `gold3.contract`. Nothing
updates them by itself: run `sync-addresses` after every deploy and
`sync-abi` after every interface change. `src/assets/abi/` is empty until the
first `sync-abi`, and the panel does not build without it.

## Permissions

Every page declares the permission it needs (`App.jsx`). The API checks every
route for itself; the `contracts.*` keys only gate what the panel offers,
because the contract pages sign straight from the browser and the chain obeys
the private key, not this panel's roles.
