import { Contract, ZeroHash, id } from 'ethers';

import { ADDRESSES, getProvider } from './client';

import GG_TOKEN_ABI from '../assets/abi/GGToken.json';
import ALLOCATION_VAULT_ABI from '../assets/abi/AllocationVault.json';
import EMISSION_CONTROLLER_ABI from '../assets/abi/EmissionController.json';
import COMPUTING_VAULT_ABI from '../assets/abi/ComputingVault.json';
import COMMUNITY_ENGINE_ABI from '../assets/abi/CommunityEngine.json';
import TIER_STAKING_ABI from '../assets/abi/TierStaking.json';
import NFT_RIGHTS_LEDGER_ABI from '../assets/abi/NFTRightsLedger.json';
import CLAIM_CONTROLLER_ABI from '../assets/abi/ClaimController.json';
import INSURANCE_TREASURY_ABI from '../assets/abi/InsuranceTreasury.json';
import RESERVE_VAULT_ABI from '../assets/abi/ReserveVault.json';
import PROTECTION_VAULT_ABI from '../assets/abi/ProtectionVault.json';
import FEE_ROUTER_ABI from '../assets/abi/FeeRouter.json';
import BUYBACK_EXECUTOR_ABI from '../assets/abi/BuybackExecutor.json';
import ORACLE_ABI from '../assets/abi/OracleAdapter.json';

// The address book and the ABIs are build-time copies of
// gold3.contract/config/addresses.json and gold3.contract/artifacts (npm run
// sync-addresses / npm run sync-abi). They are copies on purpose: the panel
// ships as static files and must not depend on the contract repo being present
// at runtime. When a contract is redeployed or its interface changes, re-copy
// both — a stale ABI here is a transaction sent to the wrong selector.
export { ADDRESSES };

// Every contract the panel can talk to, with the roles it actually declares.
//
// The key of an entry is the camelCase of its address-book key without the
// _ADDRESS suffix (COMPUTING_VAULT_ADDRESS -> computingVault). `roles` drives
// the on-chain permissions page — DEFAULT_ADMIN_ROLE is listed first
// everywhere because it is the one that can grant all the others, and the rest
// are read off the contract source, never invented.
export const CONTRACTS = {
    gg: {
        label: 'GG 代幣 (GGToken)',
        address: ADDRESSES.GG_ADDRESS,
        abi: GG_TOKEN_ABI,
        roles: ['DEFAULT_ADMIN_ROLE'],
    },
    allocationVault: {
        label: '分配金庫 (AllocationVault)',
        address: ADDRESSES.ALLOCATION_VAULT_ADDRESS,
        abi: ALLOCATION_VAULT_ABI,
        roles: ['DEFAULT_ADMIN_ROLE'],
    },
    emissionController: {
        label: '排放控制器 (EmissionController)',
        address: ADDRESSES.EMISSION_CONTROLLER_ADDRESS,
        abi: EMISSION_CONTROLLER_ABI,
        roles: ['DEFAULT_ADMIN_ROLE', 'KEEPER_ROLE'],
    },
    computingVault: {
        label: '算力金庫 (ComputingVault)',
        address: ADDRESSES.COMPUTING_VAULT_ADDRESS,
        abi: COMPUTING_VAULT_ABI,
        roles: ['DEFAULT_ADMIN_ROLE', 'EMISSION_ROLE'],
    },
    communityEngine: {
        label: '社區引擎 (CommunityEngine)',
        address: ADDRESSES.COMMUNITY_ENGINE_ADDRESS,
        abi: COMMUNITY_ENGINE_ABI,
        roles: ['DEFAULT_ADMIN_ROLE', 'EMISSION_ROLE', 'CLAIM_ROLE', 'ACCOUNTANT_ROLE'],
    },
    tierStaking: {
        label: '等級質押 (TierStaking)',
        address: ADDRESSES.TIER_STAKING_ADDRESS,
        abi: TIER_STAKING_ABI,
        roles: ['DEFAULT_ADMIN_ROLE'],
    },
    nftRightsLedger: {
        label: 'NFT 額度帳本 (NFTRightsLedger)',
        address: ADDRESSES.NFT_RIGHTS_LEDGER_ADDRESS,
        abi: NFT_RIGHTS_LEDGER_ABI,
        roles: ['DEFAULT_ADMIN_ROLE', 'CONSUMER_ROLE'],
    },
    claimController: {
        label: '社區領取 (ClaimController)',
        address: ADDRESSES.CLAIM_CONTROLLER_ADDRESS,
        abi: CLAIM_CONTROLLER_ABI,
        roles: ['DEFAULT_ADMIN_ROLE'],
    },
    insuranceTreasury: {
        label: '保障國庫 (InsuranceTreasury)',
        address: ADDRESSES.INSURANCE_TREASURY_ADDRESS,
        abi: INSURANCE_TREASURY_ABI,
        roles: ['DEFAULT_ADMIN_ROLE', 'ROUTER_ROLE', 'AIRDROP_ROLE'],
    },
    reserveVault: {
        label: '協議儲備池 (ReserveVault)',
        address: ADDRESSES.RESERVE_VAULT_ADDRESS,
        abi: RESERVE_VAULT_ABI,
        roles: ['DEFAULT_ADMIN_ROLE', 'DEPOSITOR_ROLE'],
    },
    protectionVault: {
        label: '價格保護池 (ProtectionVault)',
        address: ADDRESSES.PROTECTION_VAULT_ADDRESS,
        abi: PROTECTION_VAULT_ABI,
        roles: ['DEFAULT_ADMIN_ROLE', 'DEPOSITOR_ROLE', 'BUYER_ROLE'],
    },
    feeRouter: {
        label: '手續費路由 (FeeRouter)',
        address: ADDRESSES.FEE_ROUTER_ADDRESS,
        abi: FEE_ROUTER_ABI,
        roles: ['DEFAULT_ADMIN_ROLE', 'COLLECTOR_ROLE'],
    },
    buybackExecutor: {
        label: '回購執行 (BuybackExecutor)',
        address: ADDRESSES.BUYBACK_EXECUTOR_ADDRESS,
        abi: BUYBACK_EXECUTOR_ABI,
        roles: ['DEFAULT_ADMIN_ROLE', 'KEEPER_ROLE', 'ROUTER_ROLE'],
    },
    oracle: {
        label: '價格來源 (OracleAdapter)',
        address: ADDRESSES.ORACLE_ADAPTER_ADDRESS,
        abi: ORACLE_ABI,
        roles: ['DEFAULT_ADMIN_ROLE'],
    },
};

export function addressOf(name) {
    const entry = CONTRACTS[name];
    if (!entry) throw new Error(`unknown contract: ${name}`);
    return entry.address || '';
}

/**
 * A contract instance, or null when the address book has no address for it.
 *
 * Null is a state the pages render (disabled card, "地址簿沒有這個合約的地址"),
 * not an error — a contract that has not been deployed yet should still have
 * its panel visible so the operator can see what exists.
 */
export function contractAt(name, runner) {
    const entry = CONTRACTS[name];
    if (!entry) throw new Error(`unknown contract: ${name}`);
    if (!entry.address) return null;
    return new Contract(entry.address, entry.abi, runner || getProvider());
}

// AccessControl role ids. DEFAULT_ADMIN_ROLE is bytes32(0); every other role in
// these contracts is keccak256 of its own name.
export function roleHash(role) {
    return role === 'DEFAULT_ADMIN_ROLE' ? ZeroHash : id(role);
}

// What each role actually lets its holder do. The parenthesis names the
// contract or keeper that is supposed to hold it, where the role exists for
// exactly one caller — granting those to a person is a misconfiguration.
export const ROLE_LABELS = {
    DEFAULT_ADMIN_ROLE: '最高管理員',
    KEEPER_ROLE: 'keeper（EmissionController：每日結算 daily-settlement；BuybackExecutor：回購 buyback）',
    EMISSION_ROLE: '排放來源（EmissionController）',
    CLAIM_ROLE: '領取支付（ClaimController）',
    ACCOUNTANT_ROLE: '社區記帳員（community-accountant keeper：credit / closeDay）',
    CONSUMER_ROLE: '扣除 NFT 額度（ClaimController）',
    ROUTER_ROLE: '入庫來源（AllocationVault / EmissionController / CommunityEngine 對保障國庫；FeeRouter 對回購執行）',
    AIRDROP_ROLE: 'LP 空投供給（LPStakeVault）',
    DEPOSITOR_ROLE: '存入方（ComputingVault）',
    BUYER_ROLE: '保護池買入白名單',
    COLLECTOR_ROLE: '手續費收集方（GGToken 賣出 hook、turbine）',
};

// EIP-1967 slots. A non-zero implementation slot means the address is a proxy
// and can be upgraded; the admin slot names the ProxyAdmin that owns it.
export const IMPL_SLOT = '0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc';
export const ADMIN_SLOT = '0xb53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b5d6103';

// bytes32 tags and purposes the contracts stamp on flows, as keccak256 of
// their names (the same strings gold3.sync/utils/tags.js resolves).
export const TAGS = {
    INITIAL_RESERVE: id('INITIAL_RESERVE'),
    UNUSED_EMISSION: id('UNUSED_EMISSION'),
    UNUSED_COMMUNITY: id('UNUSED_COMMUNITY'),
    INITIAL_LIQUIDITY: id('INITIAL_LIQUIDITY'),
    INSURANCE_RESERVE: id('INSURANCE_RESERVE'),
    EMISSION_BUDGET: id('EMISSION_BUDGET'),
    TURBINE: id('TURBINE'),
    USDT_GG_SELL: id('USDT_GG_SELL'),
    GOT2_GG_SELL: id('GOT2_GG_SELL'),
    AUG_GG_SELL: id('AUG_GG_SELL'),
    GOT2_BUYBACK: id('GOT2_BUYBACK'),
    GG_BUYBACK: id('GG_BUYBACK'),
    AUG_BUYBACK: id('AUG_BUYBACK'),
};
