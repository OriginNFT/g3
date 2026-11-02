'use strict';

// Regenerates abi/*.json from the contract repo's hardhat artifacts, keeping
// only the event fragments (that is all the listeners decode).
// Run after any contract change that touches events:
//   npm run sync-abi
const { readFileSync, writeFileSync, existsSync } = require('node:fs');
const { resolve } = require('node:path');

const ARTIFACTS = resolve(__dirname, '../../gold3.contract/artifacts/contracts');
const ABI_DIR = resolve(__dirname, '../abi');

const CONTRACTS = [
    'ComputingVault',
    'EmissionController',
    'CommunityEngine',
    'TierStaking',
    'NFTRightsLedger',
    'ClaimController',
    'FeeRouter',
    'BuybackExecutor',
    'InsuranceTreasury',
    'ReserveVault',
    'ProtectionVault',
    'AllocationVault',
];

let failed = 0;

for (const name of CONTRACTS) {
    const artifactPath = resolve(ARTIFACTS, `${name}.sol/${name}.json`);
    if (!existsSync(artifactPath)) {
        console.error(`[SKIP] ${name}: artifact not found at ${artifactPath} - compile the contracts first`);
        failed++;
        continue;
    }

    const artifact = JSON.parse(readFileSync(artifactPath, 'utf8'));
    const events = artifact.abi.filter((fragment) => fragment.type === 'event');
    if (events.length === 0) {
        console.error(`[SKIP] ${name}: artifact has no events`);
        failed++;
        continue;
    }

    const target = resolve(ABI_DIR, `${name}.json`);
    writeFileSync(target, `${JSON.stringify(events, null, 2)}\n`);
    console.log(`[OK] ${name}: ${events.length} events -> ${target}`);
}

if (failed > 0) {
    console.error(`${failed} contract(s) skipped`);
    process.exit(1);
}
