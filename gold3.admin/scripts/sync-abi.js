// Regenerates src/assets/abi/*.json from the contract repo's hardhat artifacts.
// Run after any contract change that touches an interface:
//   npm run sync-abi
//
// Full ABIs, unlike gold3.sync's event-only copies: this panel calls functions
// and reads state, so it needs every fragment.
//
// A stale ABI here does not fail loudly at build time — it fails at signing
// time, by encoding a call against a selector the deployed contract no longer
// has. That is why this also cross-checks the manifest against what the source
// actually imports, in both directions.
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync, mkdirSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ARTIFACTS = resolve(HERE, '../../gold3.contract/artifacts/contracts');
const ABI_DIR = resolve(HERE, '../src/assets/abi');
const SRC_DIR = resolve(HERE, '../src');

// Output file name -> artifact path under artifacts/contracts. Every gold3
// contract is <Name>.sol/<Name>.json — the file and the contract inside it
// share a name — and the path is still written out rather than derived, so
// adding one that does not follow the rule stays a one-line change.
const CONTRACTS = {
    'GGToken.json': 'GGToken.sol/GGToken.json',
    'AllocationVault.json': 'AllocationVault.sol/AllocationVault.json',
    'EmissionController.json': 'EmissionController.sol/EmissionController.json',
    'ComputingVault.json': 'ComputingVault.sol/ComputingVault.json',
    'CommunityEngine.json': 'CommunityEngine.sol/CommunityEngine.json',
    'TierStaking.json': 'TierStaking.sol/TierStaking.json',
    'NFTRightsLedger.json': 'NFTRightsLedger.sol/NFTRightsLedger.json',
    'ClaimController.json': 'ClaimController.sol/ClaimController.json',
    'InsuranceTreasury.json': 'InsuranceTreasury.sol/InsuranceTreasury.json',
    'ReserveVault.json': 'ReserveVault.sol/ReserveVault.json',
    'ProtectionVault.json': 'ProtectionVault.sol/ProtectionVault.json',
    'FeeRouter.json': 'FeeRouter.sol/FeeRouter.json',
    'BuybackExecutor.json': 'BuybackExecutor.sol/BuybackExecutor.json',
    'OracleAdapter.json': 'OracleAdapter.sol/OracleAdapter.json',
};

// Matches an import of anything under assets/abi/, however the importing file
// happens to reach it. Written without a literal example: this script is not
// scanned, but the pattern should stay readable on its own terms.
const IMPORT_ABI = /from\s+['"][^'"]*assets\/abi\/([A-Za-z0-9_.-]+\.json)['"]/g;

function sourceFiles(dir) {
    const out = [];
    for (const entry of readdirSync(dir)) {
        const full = join(dir, entry);
        if (statSync(full).isDirectory()) {
            if (entry === 'assets') continue;
            out.push(...sourceFiles(full));
        } else if (entry.endsWith('.js') || entry.endsWith('.jsx')) {
            out.push(full);
        }
    }
    return out;
}

const imported = new Set();
for (const file of sourceFiles(SRC_DIR)) {
    for (const match of readFileSync(file, 'utf8').matchAll(IMPORT_ABI)) imported.add(match[1]);
}

if (imported.size === 0) {
    console.error('[sync-abi] no assets/abi imports found at all — the scan is broken, not the manifest');
    process.exit(1);
}

// Drift guard: something the source imports but this script does not know how
// to generate would silently keep whatever stale copy is on disk.
const unknown = [...imported].filter((name) => !CONTRACTS[name]).sort();
if (unknown.length > 0) {
    console.error(
        `[sync-abi] imported but missing from the manifest: ${unknown.join(', ')}\n` +
            'Add each one to CONTRACTS with its artifact path, or the panel will keep using a stale copy.'
    );
    process.exit(1);
}

// The directory holds nothing but generated files, so a fresh checkout may not
// have it. Create it up front: both the write loop and the stale-file scan
// below read it, and neither should die on ENOENT before the summary prints.
mkdirSync(ABI_DIR, { recursive: true });

let failed = 0;
let written = 0;

for (const [name, artifactPath] of Object.entries(CONTRACTS)) {
    const source = resolve(ARTIFACTS, artifactPath);
    if (!existsSync(source)) {
        console.error(`[FAIL] ${name}: artifact not found at ${source} — compile gold3.contract first`);
        failed++;
        continue;
    }

    let abi;
    try {
        abi = JSON.parse(readFileSync(source, 'utf8')).abi;
    } catch (err) {
        console.error(`[FAIL] ${name}: artifact is not readable JSON: ${err.message}`);
        failed++;
        continue;
    }

    if (!Array.isArray(abi) || abi.length === 0) {
        console.error(`[FAIL] ${name}: artifact has no ABI array`);
        failed++;
        continue;
    }

    const target = resolve(ABI_DIR, name);
    const next = `${JSON.stringify(abi, null, 2)}\n`;
    const previous = existsSync(target) ? readFileSync(target, 'utf8') : null;

    writeFileSync(target, next);
    written++;
    const state = previous === null ? 'new' : previous === next ? 'unchanged' : 'CHANGED';
    console.log(`[${state === 'CHANGED' ? 'CHANGED' : 'OK'}] ${name}: ${abi.length} fragments (${state})`);
}

// The reverse drift: a file left behind after a contract was dropped. Harmless
// at runtime, but it makes the directory lie about what the panel uses.
const stale = readdirSync(ABI_DIR)
    .filter((name) => name.endsWith('.json') && !CONTRACTS[name])
    .sort();
if (stale.length > 0) {
    console.log(`\n[stale] not in the manifest, safe to delete: ${stale.join(', ')}`);
}

const unused = [...Object.keys(CONTRACTS)].filter((name) => !imported.has(name)).sort();
if (unused.length > 0) {
    console.log(`[unused] generated but nothing imports them: ${unused.join(', ')}`);
}

if (failed > 0) {
    console.error(`\n${failed} contract(s) failed — the ABIs on disk are now a mix of old and new, fix and re-run`);
    process.exit(1);
}

console.log(`\n${written} ABI file(s) written to ${ABI_DIR}`);
