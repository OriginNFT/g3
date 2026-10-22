import { t } from "@lingui/macro";

// Static figures copied from the liquidity boards (3-1 .. 3-5).

export type PoolKey = "got2-gg" | "aug-gg";

export type PoolToken = { symbol: string; amount: string; usd: string; share: string };

export const ecoPools = () => [
    {
        key: "got2-gg" as PoolKey,
        name: t`GOT2 / GG 池`,
        art: "GOT2",
        value: "$ 18,520,490",
        delta: "+12.6%",
        tokens: [
            { symbol: "GOT2", amount: "9,120,000", usd: "$ 9,130,225", share: "50%" },
            { symbol: "GG", amount: "1,420,000", usd: "$ 9,130,225", share: "50%" },
        ] as PoolToken[],
        apr: "12.6%",
        volume24h: "$ 1,286,450",
        share: "62.3%",
    },
    {
        key: "aug-gg" as PoolKey,
        name: t`AUG / GG 池`,
        art: "AUG",
        value: "$ 18,260,440",
        delta: "+14.8%",
        tokens: [
            { symbol: "AUG", amount: "152,800", usd: "$ 9,130,220", share: "50%" },
            { symbol: "GG", amount: "1,420,000", usd: "$ 9,130,220", share: "50%" },
        ] as PoolToken[],
        apr: "14.6%",
        volume24h: "$ 1,368,220",
        share: "37.7%",
    },
];

export type EcoPool = ReturnType<typeof ecoPools>[number];

export const poolRows = () => [
    { a: "GOT2", b: "GG", value: "$ 18,260,450", volume: "$ 1,286,450", apr: "12.6%", share: "62.3%" },
    { a: "AUG", b: "GG", value: "$ 18,260,440", volume: "$ 1,368,220", apr: "14.8%", share: "37.7%" },
    { a: "GG", b: "USDT", value: "$ 3,520,000", volume: "$ 986,450", apr: "8.6%", share: "-" },
    { a: "AUG", b: "USDT", value: "$ 2,480,000", volume: "$ 645,410", apr: "9.2%", share: "-" },
];

export const TREND_LABELS = ["10/12", "10/13", "10/14", "10/15", "10/16", "10/17", "10/18"];

export const poolDetails = () => ({
    "got2-gg": {
        title: t`GOT2 / GG 池`,
        subtitle: t`增強流動性深度 · 穩定價格運行`,
        art: "GOT2",
        value: "$ 18,520,490",
        valueDelta: "+12.6%",
        volume24h: "$ 1,286,450",
        volumeDelta: "+18.4%",
        share: 62.3,
        tokens: [
            { symbol: "GOT2", amount: "9,120,000", usd: "($ 9,130,225)", share: "50%" },
            { symbol: "GG", amount: "1,420,000", usd: "($ 9,130,225)", share: "50%" },
        ] as PoolToken[],
        stats: [
            [t`年化收益（參考）`, "12.6%"],
            [t`24h 交易量 (USD)`, "$ 1,286,450"],
            [t`7日交易量 (USD)`, "$ 8,965,230"],
            [t`30日交易量 (USD)`, "$ 36,520,890"],
            [t`池子創建時間`, "2026-06-20"],
            [t`參與地址數`, "6,280"],
        ] as [string, string][],
        volumeTrend: [
            [950_000, 1_000_000, 1_650_000, 1_000_000, 1_600_000, 1_500_000, 1_750_000],
            [520_000, 600_000, 820_000, 500_000, 900_000, 650_000, 1_300_000],
        ],
        shareTrend: [52, 55, 50, 58, 54, 60, 56],
    },
    "aug-gg": {
        title: t`AUG / GG 池`,
        subtitle: t`提升資金效率 · 共享生態增長`,
        art: "AUG",
        value: "$ 18,260,440",
        valueDelta: "+14.8%",
        volume24h: "$ 1,368,220",
        volumeDelta: "+22.3%",
        share: 37.7,
        tokens: [
            { symbol: "AUG", amount: "152,800", usd: "($ 9,130,220)", share: "50%" },
            { symbol: "GG", amount: "1,420,000", usd: "($ 9,130,220)", share: "50%" },
        ] as PoolToken[],
        stats: [
            [t`年化收益（參考）`, "14.6%"],
            [t`24h 交易量 (USD)`, "$ 1,368,220"],
            [t`7日交易量 (USD)`, "$ 8,520,440"],
            [t`30日交易量 (USD)`, "$ 34,860,220"],
            [t`池子創建時間`, "2026-06-20"],
            [t`參與地址數`, "6,200"],
        ] as [string, string][],
        volumeTrend: [
            [880_000, 1_120_000, 1_400_000, 1_250_000, 1_500_000, 1_380_000, 1_620_000],
            [480_000, 700_000, 760_000, 640_000, 820_000, 700_000, 1_100_000],
        ],
        shareTrend: [48, 50, 47, 52, 51, 53, 50],
    },
});

export const LIQUIDITY_PAIRS = ["GOT2 / GG", "AUG / GG", "GG / USDT", "AUG / USDT"];
