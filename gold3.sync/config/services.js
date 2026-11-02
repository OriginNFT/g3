'use strict';

// Single source of truth for the sync services. Consumed by ecosystem.config.js
// (pm2 app list) and by scripts/ (cursor + status tooling).
//
// kind:
//   'listener' - event -> DB, driven by a Redis block cursor; one table each
//   'keeper'   - sends transactions on a tick loop; no cursor
//
// Every listener requires abi/<Contract>.json, which only `npm run sync-abi`
// produces from the compiled gold3.contract artifacts - until then the
// process exits at require time with MODULE_NOT_FOUND (`npm run check-abi`
// names it).
const SERVICES = [
    { name: 'position', script: 'listeners/position.js', kind: 'listener', table: 'gold3_position_records, gold3_holding_days' },
    { name: 'emission', script: 'listeners/emission.js', kind: 'listener', table: 'gold3_emission_days' },
    { name: 'community', script: 'listeners/community.js', kind: 'listener', table: 'gold3_community_days, gold3_community_credits' },
    { name: 'tier', script: 'listeners/tier.js', kind: 'listener', table: 'gold3_tier_records' },
    { name: 'rights', script: 'listeners/rights.js', kind: 'listener', table: 'gold3_rights_records' },
    { name: 'fee', script: 'listeners/fee.js', kind: 'listener', table: 'gold3_fee_records' },
    { name: 'treasury', script: 'listeners/treasury.js', kind: 'listener', table: 'gold3_treasury_flows' },
    { name: 'oracle-updater', script: 'keepers/oracle-updater.js', kind: 'keeper' },
    { name: 'daily-settlement', script: 'keepers/daily-settlement.js', kind: 'keeper' },
    { name: 'buyback', script: 'keepers/buyback.js', kind: 'keeper' },
    { name: 'community-accountant', script: 'keepers/community-accountant.js', kind: 'keeper' },
];

const SERVICE_NAMES = SERVICES.map((s) => s.name);
const LISTENER_NAMES = SERVICES.filter((s) => s.kind === 'listener').map((s) => s.name);

module.exports = { SERVICES, SERVICE_NAMES, LISTENER_NAMES };
