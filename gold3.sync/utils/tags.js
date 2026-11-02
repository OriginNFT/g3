'use strict';

const { id } = require('ethers');

// The bytes32 tags the contracts stamp on treasury flows, fee routes and
// allocation releases, as keccak256 of a short string (ethers id()). The
// listeners store the hex in a `*_tag` column and the resolved name next to
// it, so queries can group by a readable label instead of a hash.
//
//   INITIAL_RESERVE     TAG_INITIAL            InsuranceTreasury (AllocationVault.releaseInsuranceReserve)
//   UNUSED_EMISSION     TAG_UNUSED_EMISSION    InsuranceTreasury (EmissionController)
//   UNUSED_COMMUNITY    TAG_UNUSED_COMMUNITY   InsuranceTreasury (CommunityEngine.closeDay)
//   LP_AIRDROP          PURPOSE_LP_AIRDROP     InsuranceTreasury.supplyAirdrop
//   INITIAL_LIQUIDITY / INSURANCE_RESERVE / EMISSION_BUDGET   AllocationVault buckets
//   TURBINE / USDT_GG_SELL / GOT2_GG_SELL / AUG_GG_SELL        FeeRouter sources
//   GOT2_BUYBACK / GG_BUYBACK / AUG_BUYBACK / LP_INCENTIVE /
//   ECO_RESERVE / COMMUNITY_BUILDING                           FeeRouter purposes

const TAG_NAMES = [
    'INITIAL_RESERVE',
    'UNUSED_EMISSION',
    'UNUSED_COMMUNITY',
    'LP_AIRDROP',
    'INITIAL_LIQUIDITY',
    'INSURANCE_RESERVE',
    'EMISSION_BUDGET',
    'TURBINE',
    'USDT_GG_SELL',
    'GOT2_GG_SELL',
    'AUG_GG_SELL',
    'GOT2_BUYBACK',
    'GG_BUYBACK',
    'AUG_BUYBACK',
    'LP_INCENTIVE',
    'ECO_RESERVE',
    'COMMUNITY_BUILDING',
];

// name -> 0x-prefixed 32-byte hex (lowercase, as ethers id() returns it)
const TAGS = Object.freeze(Object.fromEntries(TAG_NAMES.map((name) => [name, id(name)])));

// hex (lowercase) -> name
const NAME_BY_HASH = new Map(TAG_NAMES.map((name) => [TAGS[name], name]));

// bytes32 hex of a known tag name. Throws for an unknown name.
function tagHash(name) {
    const hash = TAGS[name];
    if (!hash) throw new Error(`unknown tag "${name}" (known: ${TAG_NAMES.join(', ')})`);
    return hash;
}

// Reverse lookup: the tag name for a bytes32 hex, or null when the hash is
// not in the table (an unknown tag is stored with its name null, never
// dropped). `hex` is a hash, not an address, so normalising its case is safe.
function tagName(hex) {
    if (hex === null || hex === undefined) return null;
    return NAME_BY_HASH.get(String(hex).toLowerCase()) || null;
}

// CommunityEngine bucket ids (uint8 on chain) -> name.
const BUCKET_NAMES = ['EXPANSION', 'COLLABORATION', 'CONTRIBUTION', 'DAO_BUILDING', 'PLATFORM'];

function bucketName(bucket) {
    return BUCKET_NAMES[Number(bucket)] || null;
}

function bucketId(name) {
    const i = BUCKET_NAMES.indexOf(name);
    if (i < 0) throw new Error(`unknown bucket "${name}" (known: ${BUCKET_NAMES.join(', ')})`);
    return i;
}

module.exports = { TAG_NAMES, TAGS, tagHash, tagName, BUCKET_NAMES, bucketName, bucketId };
