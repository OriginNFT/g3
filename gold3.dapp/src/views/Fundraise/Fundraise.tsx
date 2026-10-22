import { useEffect, useState } from "react";
import { t } from "@lingui/macro";
import { BaseError, erc20Abi, formatUnits, parseUnits, zeroAddress } from "viem";
import { useAccount, useReadContract, useReadContracts, useWaitForTransactionReceipt, useWriteContract } from "wagmi";

import { GOLD3_FUNDRAISE_ABI } from "src/abi/Gold3Fundraise";
import Card from "src/components/Card/Card";
import Icon from "src/components/Icon/Icon";
import KvList from "src/components/KvList/KvList";
import PageHeader from "src/components/PageHeader/PageHeader";
import Progress from "src/components/Progress/Progress";
import { ANUBIS_CHAIN_ID, FUNDRAISE_ADDRESS, USDT_ADDRESS, USDT_DECIMALS } from "src/constants";
import FundraiseRules from "./FundraiseRules";

// 募資 - the layout of origin.anubis.dapp's fundraise page in this project's
// card style: countdown, 共建進度, the subscribe form, the rules, the limits
// and 我的認購. Everything Gold3Fundraise does not hold (the raise window, the
// rules, GG price, effective power) renders as DASH. Approve covers this
// subscription only.

const DEPLOYED = FUNDRAISE_ADDRESS !== zeroAddress;
const DASH = "——";
// USDT participation counts 2.5x towards power (spec §04).
const POWER_X10 = 25n;
const AMOUNT_PATTERN = new RegExp(`^\\d*(\\.\\d{0,${USDT_DECIMALS}})?$`);

function fmt(value: bigint): string {
    return Number(formatUnits(value, USDT_DECIMALS)).toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
}

// startTime as "2026-10-23 00:00 SGT".
function fmtStart(startTime: bigint): string {
    const text = new Date(Number(startTime) * 1000).toLocaleString("sv-SE", {
        timeZone: "Asia/Singapore",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
    });
    return `${text} SGT`;
}

function errorMessage(err: unknown): string {
    return err instanceof BaseError ? err.shortMessage : (err as Error).message;
}

// Counts down to startTime on the page's one-second tick; from startTime on
// every tile reads 00. Before startTime is read, or with no start time (0),
// the tiles stay disabled.
function Countdown({ startTime, now, startText }: { startTime: bigint | undefined; now: number; startText: string }) {
    const units = [t`天`, t`時`, t`分`, t`秒`];
    const known = startTime !== undefined && startTime > 0n;
    const left = known ? Math.max(Number(startTime) - now, 0) : 0;
    const figures = known
        ? [Math.floor(left / 86400), Math.floor((left % 86400) / 3600), Math.floor((left % 3600) / 60), left % 60].map(n =>
              String(n).padStart(2, "0"),
          )
        : units.map(() => DASH);
    let chip = t`時間未公布`;
    if (known) chip = left > 0 ? startText : t`進行中`;
    return (
        <Card icon="clock" title={t`募資倒數`} right={<span className="gp-chip">{chip}</span>}>
            <div className={`gp-countdown ${known ? "" : "is-disabled"}`}>
                {units.map((unit, i) => (
                    <div className="gp-tile gp-countdown-tile" key={unit}>
                        <span className="gp-fundraise-figure">{figures[i]}</span>
                        <span className="gp-muted gp-small">{unit}</span>
                    </div>
                ))}
            </div>
        </Card>
    );
}

function Fundraise() {
    const [amount, setAmount] = useState("");
    const [error, setError] = useState("");
    const { address, isConnected } = useAccount();
    const account = address ?? zeroAddress;

    const stats = useReadContract({
        address: FUNDRAISE_ADDRESS,
        abi: GOLD3_FUNDRAISE_ABI,
        functionName: "stats",
        chainId: ANUBIS_CHAIN_ID,
        query: { enabled: DEPLOYED },
    });
    const start = useReadContract({
        address: FUNDRAISE_ADDRESS,
        abi: GOLD3_FUNDRAISE_ABI,
        functionName: "startTime",
        chainId: ANUBIS_CHAIN_ID,
        query: { enabled: DEPLOYED },
    });
    const mine = useReadContracts({
        allowFailure: false,
        contracts: [
            { address: FUNDRAISE_ADDRESS, abi: GOLD3_FUNDRAISE_ABI, functionName: "totalUsdtOf", args: [account], chainId: ANUBIS_CHAIN_ID },
            { address: FUNDRAISE_ADDRESS, abi: GOLD3_FUNDRAISE_ABI, functionName: "userRecordCount", args: [account], chainId: ANUBIS_CHAIN_ID },
            { address: FUNDRAISE_ADDRESS, abi: GOLD3_FUNDRAISE_ABI, functionName: "remainingOf", args: [account], chainId: ANUBIS_CHAIN_ID },
            { address: USDT_ADDRESS, abi: erc20Abi, functionName: "balanceOf", args: [account], chainId: ANUBIS_CHAIN_ID },
            { address: USDT_ADDRESS, abi: erc20Abi, functionName: "allowance", args: [account, FUNDRAISE_ADDRESS], chainId: ANUBIS_CHAIN_ID },
        ],
        query: { enabled: DEPLOYED && !!address },
    });

    const { writeContractAsync, data: txHash, isPending: isSigning } = useWriteContract();
    const receipt = useWaitForTransactionReceipt({ hash: txHash, chainId: ANUBIS_CHAIN_ID });

    useEffect(() => {
        if (stats.error) console.error("fundraise: stats read failed:", stats.error.message, stats.error);
    }, [stats.error]);

    useEffect(() => {
        if (start.error) console.error("fundraise: startTime read failed:", start.error.message, start.error);
    }, [start.error]);

    // Re-checked every second until startTime has passed, so the page opens
    // without a reload.
    const startTime = start.data;
    const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
    const started = startTime !== undefined && BigInt(now) >= startTime;
    useEffect(() => {
        if (started) return;
        const id = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
        return () => clearInterval(id);
    }, [started]);

    useEffect(() => {
        if (mine.error) console.error("fundraise: account reads failed:", mine.error.message, mine.error);
    }, [mine.error]);

    const refetchStats = stats.refetch;
    const refetchMine = mine.refetch;
    useEffect(() => {
        if (receipt.isSuccess) {
            refetchStats();
            refetchMine();
        }
    }, [receipt.isSuccess, refetchStats, refetchMine]);

    useEffect(() => {
        if (receipt.error) {
            console.error("fundraise: transaction failed:", receipt.error.message, receipt.error);
            setError(errorMessage(receipt.error));
        }
    }, [receipt.error]);

    // stats() -> [raised, target, minContribution, maxPerAddress, records, closed]
    const s = stats.data;
    const raised = s?.[0];
    const target = s?.[1];
    const minContribution = s?.[2];
    const maxPerAddress = s?.[3];
    const closed = s?.[5];
    const m = mine.data;
    const myTotal = m?.[0];
    const myCount = m?.[1];
    const remaining = m?.[2];
    const balance = m?.[3];
    const allowance = m?.[4];

    // A limit reads back as 0 when it is off: show DASH, not 0.00.
    const hasTarget = target !== undefined && target > 0n;
    const hasMin = minContribution !== undefined && minContribution > 0n;
    const hasMax = maxPerAddress !== undefined && maxPerAddress > 0n;
    const targetText = hasTarget ? `${fmt(target)} USDT` : `${DASH} USDT`;
    const minText = hasMin ? `${fmt(minContribution)} USDT` : `${DASH} USDT`;
    const maxText = hasMax ? `${fmt(maxPerAddress)} USDT` : `${DASH} USDT`;
    const progress = raised !== undefined && hasTarget ? Number((raised * 10_000n) / target) / 100 : 0;
    const progressText = raised !== undefined && hasTarget ? `${progress.toFixed(1)}%` : `${DASH}%`;
    const startText = startTime !== undefined && startTime > 0n ? fmtStart(startTime) : DASH;
    let statusText = DASH;
    if (closed !== undefined && startTime !== undefined) {
        if (closed) statusText = t`已關閉`;
        else statusText = started ? t`進行中` : t`未開始`;
    }

    const parsed = amount ? parseUnits(amount, USDT_DECIMALS) : 0n;
    const insufficient = balance !== undefined && parsed > balance;
    const needsApproval = allowance !== undefined && parsed > allowance;
    const belowMin = hasMin && parsed < minContribution;
    const overRemaining = remaining !== undefined && parsed > remaining;
    // Room left under the target; below minContribution nobody can get in.
    const room = hasTarget && raised !== undefined ? (target > raised ? target - raised : 0n) : undefined;
    const quotaFull = room !== undefined && ((hasMin && room < minContribution) || parsed > room);

    const balanceText = balance !== undefined ? fmt(balance) : DASH;
    const expectedText = fmt((parsed * POWER_X10) / 10n);
    const amountPercent = hasMax ? Number((parsed * 10_000n) / maxPerAddress) / 100 : 0;
    const remainingText =
        hasMax && remaining !== undefined ? `${fmt(remaining)} / ${fmt(maxPerAddress)} USDT` : `${DASH} USDT`;
    const myTotalText = myTotal !== undefined ? fmt(myTotal) : DASH;
    const myCountText = myCount !== undefined ? String(myCount) : DASH;

    async function approve() {
        setError("");
        try {
            await writeContractAsync({
                address: USDT_ADDRESS,
                abi: erc20Abi,
                functionName: "approve",
                args: [FUNDRAISE_ADDRESS, parsed],
                chainId: ANUBIS_CHAIN_ID,
            });
        } catch (err) {
            console.error("fundraise: approve failed:", (err as Error).message, err);
            setError(errorMessage(err));
        }
    }

    async function subscribe() {
        setError("");
        try {
            await writeContractAsync({
                address: FUNDRAISE_ADDRESS,
                abi: GOLD3_FUNDRAISE_ABI,
                functionName: "subscribe",
                args: [parsed],
                chainId: ANUBIS_CHAIN_ID,
            });
        } catch (err) {
            console.error("fundraise: subscribe failed:", (err as Error).message, err);
            setError(errorMessage(err));
        }
    }

    let cta: { label: string; action?: () => void };
    if (!DEPLOYED) cta = { label: t`尚未上線` };
    else if (!isConnected) cta = { label: t`請先連接錢包` };
    else if (stats.isError || start.isError || mine.isError) cta = { label: t`讀取失敗` };
    else if (s === undefined || startTime === undefined || m === undefined) cta = { label: t`讀取中` };
    else if (closed) cta = { label: t`募資已關閉` };
    else if (!started) cta = { label: t`尚未開始` };
    else if (isSigning) cta = { label: t`請在錢包確認` };
    else if (receipt.isLoading) cta = { label: t`交易確認中…` };
    else if (parsed === 0n) cta = { label: t`請輸入金額` };
    else if (quotaFull) cta = { label: t`額度不足` };
    else if (insufficient) cta = { label: t`USDT 餘額不足` };
    else if (belowMin) cta = { label: t`低於最低認購金額` };
    else if (overRemaining) cta = { label: t`超過單地址上限` };
    else if (needsApproval) cta = { label: t`授權 USDT`, action: approve };
    else cta = { label: t`認購`, action: subscribe };

    const readError = stats.error ?? start.error ?? mine.error;
    const message = error || (readError ? t`讀取失敗：${errorMessage(readError)}` : "");

    return (
        <div className="gp-stack gp-fundraise">
            <PageHeader title={t`募資`} subtitle={t`以 USDT 認購，每筆認購都記錄在鏈上`} />

            {!DEPLOYED && (
                <div className="gp-fundraise-banner">
                    <Icon name="info" size={18} />
                    <div>
                        <div className="gp-strong">{t`尚未上線`}</div>
                        <div className="gp-small">{t`募資合約尚未部署到此網路。`}</div>
                    </div>
                </div>
            )}

            <Countdown startTime={startTime} now={now} startText={startText} />

            <Card icon="chart" title={t`協議共建進度`} right={<span className="gp-chip">{statusText}</span>}>
                <div className="gp-fundraise-body">
                    <div className="gp-fundraise-figure">{progressText}</div>
                    <Progress value={progress} tone="gold" />
                    <KvList
                        compact
                        rows={[
                            [t`當前共建目標`, targetText],
                            [t`開始時間`, startText],
                        ]}
                    />
                </div>
            </Card>

            <Card
                icon="coins"
                title={t`認購`}
                right={<span className="gp-muted gp-small">{t`可用餘額：${balanceText} USDT`}</span>}
            >
                <div className="gp-fundraise-body">
                    <div className="gp-fundraise-input">
                        <input
                            className="gp-amount-input"
                            placeholder="0.00"
                            inputMode="decimal"
                            value={amount}
                            onChange={event => {
                                if (AMOUNT_PATTERN.test(event.target.value)) setAmount(event.target.value);
                            }}
                            disabled={!DEPLOYED || closed === true}
                        />
                        <span className="gp-strong">USDT</span>
                    </div>

                    <Progress value={amountPercent} />
                    <div className="gp-row gp-between gp-muted gp-small">
                        <span>{t`最低 ${minText}`}</span>
                        <span>{t`上限 ${maxText}`}</span>
                    </div>
                    <div className="gp-small">{t`預計獲得算力：${expectedText} USDT`}</div>

                    <button
                        type="button"
                        className="gp-btn gp-btn-primary gp-btn-block"
                        onClick={cta.action}
                        disabled={!cta.action}
                    >
                        {cta.label}
                        <Icon name="arrowRight" size={16} />
                    </button>

                    <KvList compact className="gp-kv--boxed" rows={[[t`剩餘可認購額度`, remainingText]]} />

                    <div className="gp-row gp-muted gp-small">
                        <Icon name="shield" size={14} />
                        {t`每筆認購都會記錄在鏈上`}
                    </div>

                    {message && <p className="gp-fundraise-error gp-small">{message}</p>}
                </div>
            </Card>

            <FundraiseRules targetText={targetText} maxText={maxText} startText={startText} />

            <Card icon="scale" title={t`計價與限額`}>
                <KvList
                    rows={[
                        [t`USDT 計價基準`, "1 USDT = 1 USD"],
                        [t`GG 市場價格`, `${DASH} USDT`],
                        [t`最低認購金額`, minText],
                        [t`單地址認購上限`, maxText],
                    ]}
                />
            </Card>

            <Card icon="assets" title={t`我的認購`}>
                <div className="gp-fundraise-body">
                    <div className="gp-fundraise-mine">
                        <span className="gp-muted gp-small">{t`已認購`}</span>
                        <span className="gp-fundraise-figure">{myTotalText} USDT</span>
                    </div>
                    <KvList
                        className="gp-kv--boxed"
                        rows={[
                            [t`認購次數`, myCountText],
                            [t`有效算力`, `${DASH} USDT`],
                        ]}
                    />
                </div>
            </Card>
        </div>
    );
}

export default Fundraise;
