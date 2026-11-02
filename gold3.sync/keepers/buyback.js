'use strict';
require('dotenv').config();

/**
 * Buyback keeper.
 *
 * Spends the buyback budgets FeeRouter books in BuybackExecutor
 * (budgetOf(purpose, tokenIn), one per GOT2 / GG / AUG buyback) by calling
 * executeBuyback(path, amountIn, minOut): the executor swaps on the
 * whitelisted path, burns everything it receives and emits BuybackExecuted +
 * TokensBurned. One purpose per tick, the first whose budget is at least
 * BUYBACK_MIN_BUDGET; straight on to the next tick while another is due.
 *
 * Quote. The contract refuses a minOut below the OracleAdapter TWAP-implied
 * output less maxSlippageBps(). The keeper computes the same expected output
 * (valueUSDT(tokenIn, amountIn) / priceUSDT(tokenOut)) and submits
 * expected x (1 - maxSlippageBps + BUYBACK_SLIPPAGE_MARGIN_BPS): a margin
 * inside the contract's limit, so a quote that moved between the read and
 * the send fails on chain instead of overpaying.
 *
 * Paths come from config/addresses.json[NETWORK].BUYBACK_PATHS, one array of
 * address-book keys per purpose, e.g.
 *   "BUYBACK_PATHS": { "GOT2_BUYBACK": ["USDT_ADDRESS", "GG_ADDRESS", "GOT2_ADDRESS"], ... }
 * Every path is checked against the executor's whitelist at startup.
 *
 * Cadence gate:  budgetOf(purpose, path[0]) >= BUYBACK_MIN_BUDGET for some purpose.
 * Idempotency:   on chain - the budget is spent by the call. Nothing in Redis.
 *
 * Usage:
 *   node keepers/buyback.js              run
 *   node keepers/buyback.js --dry-run    read + decide, send nothing
 *
 * Env: BUYBACK_PK (the wallet holding KEEPER_ROLE on BuybackExecutor),
 *      BUYBACK_MIN_BUDGET (whole tokenIn units, default 100),
 *      BUYBACK_SLIPPAGE_MARGIN_BPS (default 50), plus the shared KEEPER_*
 *      variables (utils/keeper.js).
 */

const { Contract, formatUnits, parseUnits, id, solidityPackedKeccak256 } = require('ethers');

const config = require('../config');
const { ready } = require('../model');
const {
    TICK_INTERVAL_SECONDS,
    isDryRun,
    createProvider,
    createWallet,
    resolveGasOverrides,
    assertRole,
    eventsOf,
    runTickLoop,
} = require('../utils/keeper');

const SERVICE_NAME = 'buyback';

const DRY_RUN = isDryRun();

const EXECUTOR_ABI = [
    'function budgetOf(bytes32 purpose, address token) view returns (uint256)',
    'function maxSingleAmount() view returns (uint256)',
    'function maxSlippageBps() view returns (uint256)',
    'function allowedPath(bytes32 pathHash) view returns (bool)',
    'function hasRole(bytes32 role, address account) view returns (bool)',
    'function executeBuyback(address[] path, uint256 amountIn, uint256 minOut) returns (uint256 amountOut)',
    'event BuybackExecuted(address indexed tokenIn, address indexed tokenOut, uint256 amountIn, uint256 amountOut)',
    'event TokensBurned(address indexed token, uint256 amount)',
];
const ORACLE_ABI = [
    'function priceUSDT(address token) view returns (uint256)',
    'function valueUSDT(address token, uint256 amount) view returns (uint256)',
];
const ERC20_ABI = ['function decimals() view returns (uint8)'];

const PURPOSES = ['GOT2_BUYBACK', 'GG_BUYBACK', 'AUG_BUYBACK'];

function num(name, fallback) {
    const raw = process.env[name];
    if (raw === undefined || raw === '') return fallback;
    const value = Number(raw);
    if (!Number.isFinite(value)) throw new Error(`env ${name} is not a number: ${raw}`);
    return value;
}

const MIN_BUDGET = process.env.BUYBACK_MIN_BUDGET || '100';
const SLIPPAGE_MARGIN_BPS = num('BUYBACK_SLIPPAGE_MARGIN_BPS', 50);
if (!Number.isInteger(SLIPPAGE_MARGIN_BPS) || SLIPPAGE_MARGIN_BPS < 0) {
    throw new Error(`env BUYBACK_SLIPPAGE_MARGIN_BPS must be an integer >= 0, got ${SLIPPAGE_MARGIN_BPS}`);
}

let provider = null;
let wallet = null;
let executor = null;
let oracle = null;
// purpose name -> { purpose, tag, path, tokenIn, tokenOut, decimalsIn, decimalsOut, minBudget }
let targets = [];

function log(message) {
    console.log(`[${SERVICE_NAME}]${DRY_RUN ? ' [DRY-RUN]' : ''} ${message}`);
}

function warn(message) {
    console.warn(`[${SERVICE_NAME}]${DRY_RUN ? ' [DRY-RUN]' : ''} ${message}`);
}

function pathHash(path) {
    return solidityPackedKeccak256(['address[]'], [path]);
}

// Resolves BUYBACK_PATHS from the address book into checked targets.
async function loadTargets(runner) {
    const book = config.addresses.BUYBACK_PATHS;
    if (!book || typeof book !== 'object') {
        throw new Error(`BUYBACK_PATHS missing from config/addresses.json[${config.NETWORK}]`);
    }
    const out = [];
    for (const purpose of PURPOSES) {
        const keys = book[purpose];
        if (!Array.isArray(keys) || keys.length < 2) {
            throw new Error(`BUYBACK_PATHS.${purpose} must be an array of at least two address-book keys`);
        }
        const path = keys.map((k) => config.addressOf(k));
        const hash = pathHash(path);
        if (!(await executor.allowedPath(hash))) {
            throw new Error(`${purpose} path [${keys.join(' -> ')}] is not whitelisted on BuybackExecutor (setPathAllowed)`);
        }
        const tokenIn = path[0];
        const tokenOut = path[path.length - 1];
        const decimalsIn = Number(await new Contract(tokenIn, ERC20_ABI, runner).decimals());
        const decimalsOut = Number(await new Contract(tokenOut, ERC20_ABI, runner).decimals());
        out.push({
            purpose,
            tag: id(purpose),
            keys,
            path,
            tokenIn,
            tokenOut,
            decimalsIn,
            decimalsOut,
            minBudget: parseUnits(MIN_BUDGET, decimalsIn),
        });
    }
    return out;
}

async function tick(status) {
    const head = await provider.getBlock('latest');
    if (!head) throw new Error('provider returned no latest block');
    status.latestChainBlock = head.number;
    status.currentBlock = head.number;
    status.lastBlock = head.number;

    const [maxSingle, maxSlippageBps] = await Promise.all([executor.maxSingleAmount(), executor.maxSlippageBps()]);
    status.customStatus.maxSingleAmount = maxSingle.toString();
    status.customStatus.maxSlippageBps = maxSlippageBps.toString();
    if (maxSingle === 0n) {
        warn('maxSingleAmount() is 0 - setMaxSingleAmount has not run, nothing can be bought');
        return false;
    }
    if (BigInt(SLIPPAGE_MARGIN_BPS) > maxSlippageBps) {
        throw new Error(`BUYBACK_SLIPPAGE_MARGIN_BPS ${SLIPPAGE_MARGIN_BPS} exceeds the contract's maxSlippageBps ${maxSlippageBps}`);
    }

    const budgets = {};
    let due = null;
    for (const t of targets) {
        const budget = await executor.budgetOf(t.tag, t.tokenIn);
        budgets[t.purpose] = `${formatUnits(budget, t.decimalsIn)} (${budget.toString()})`;
        if (!due && budget >= t.minBudget) due = { target: t, budget };
    }
    status.customStatus.budgets = budgets;

    if (!due) {
        log(`no budget at or above ${MIN_BUDGET}: ${JSON.stringify(budgets)}`);
        return false;
    }

    const { target: t, budget } = due;
    const amountIn = budget < maxSingle ? budget : maxSingle;
    const [valueIn, priceOut] = await Promise.all([oracle.valueUSDT(t.tokenIn, amountIn), oracle.priceUSDT(t.tokenOut)]);
    if (priceOut === 0n) throw new Error(`OracleAdapter.priceUSDT(${t.tokenOut}) is 0 - no TWAP yet`);
    const expectedOut = (valueIn * 10n ** BigInt(t.decimalsOut)) / priceOut;
    const minOut = (expectedOut * (BigInt(config.BPS) - maxSlippageBps + BigInt(SLIPPAGE_MARGIN_BPS))) / BigInt(config.BPS);

    const summary =
        `${t.purpose} path=[${t.keys.join(' -> ')}] amountIn=${formatUnits(amountIn, t.decimalsIn)} ` +
        `(budget ${formatUnits(budget, t.decimalsIn)}, cap ${formatUnits(maxSingle, t.decimalsIn)}) ` +
        `expectedOut=${formatUnits(expectedOut, t.decimalsOut)} minOut=${formatUnits(minOut, t.decimalsOut)}`;

    if (DRY_RUN) {
        log(`would executeBuyback: ${summary}`);
        return false;
    }

    const overrides = await resolveGasOverrides(provider);
    const tx = await executor.executeBuyback(t.path, amountIn, minOut, overrides);
    log(`BuybackExecutor.executeBuyback ${summary} tx=${tx.hash}, waiting`);
    const receipt = await tx.wait();
    if (receipt.status !== 1) throw new Error(`executeBuyback ${t.purpose}: ${tx.hash} reverted`);

    const [executed] = eventsOf(executor, receipt, 'BuybackExecuted');
    const [burned] = eventsOf(executor, receipt, 'TokensBurned');
    if (executed) {
        log(
            `${t.purpose} bought ${formatUnits(executed.args.amountOut, t.decimalsOut)} with ${formatUnits(executed.args.amountIn, t.decimalsIn)} ` +
                `burned=${burned ? formatUnits(burned.args.amount, t.decimalsOut) : 'n/a'} tx=${tx.hash}`
        );
    } else {
        warn(`executeBuyback landed in ${tx.hash} but no BuybackExecuted event was found`);
    }

    status.customStatus.lastBuyback = {
        purpose: t.purpose,
        amountIn: amountIn.toString(),
        amountOut: executed ? executed.args.amountOut.toString() : null,
        tx: tx.hash,
        at: new Date().toISOString(),
    };

    // Another purpose may be due as well: go straight on.
    for (const other of targets) {
        if (other === t) continue;
        if ((await executor.budgetOf(other.tag, other.tokenIn)) >= other.minBudget) return true;
    }
    return (await executor.budgetOf(t.tag, t.tokenIn)) >= t.minBudget;
}

async function start() {
    await ready;

    provider = await createProvider();
    // A dry run needs no key: reads go through the provider and nothing is sent.
    wallet = createWallet('BUYBACK_PK', { provider });
    const runner = wallet || provider;

    const executorAddress = config.addressOf('BUYBACK_EXECUTOR_ADDRESS');
    const oracleAddress = config.addressOf('ORACLE_ADAPTER_ADDRESS');
    executor = new Contract(executorAddress, EXECUTOR_ABI, runner);
    oracle = new Contract(oracleAddress, ORACLE_ABI, runner);

    await assertRole(executor, 'KEEPER_ROLE', wallet ? wallet.address : null, 'the BuybackExecutor KEEPER_ROLE grant script');
    targets = await loadTargets(runner);

    log(
        `network=${config.NETWORK} rpc=${config.rpcUrl} signer=${wallet ? wallet.address : 'none (dry-run)'} ` +
            `executor=${executorAddress} oracle=${oracleAddress} minBudget=${MIN_BUDGET} marginBps=${SLIPPAGE_MARGIN_BPS} ` +
            `paths=${targets.map((t) => `${t.purpose}:[${t.keys.join('->')}]`).join(' ')} tick=${TICK_INTERVAL_SECONDS}s`
    );

    await runTickLoop({ serviceName: SERVICE_NAME, tick });
}

if (require.main === module) {
    start().catch((err) => {
        console.error(`[FATAL] ${SERVICE_NAME}:`, err.message, err);
        process.exit(1);
    });
}

module.exports = { start };
