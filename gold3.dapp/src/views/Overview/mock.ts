import { t } from "@lingui/macro";

import { ACCENT, GOLD } from "src/themes/tokens";

// Static figures copied from the overview boards. Functions, so `t` runs at render.

export const RELEASED_PCT = 62.48;

export const emissionStages = () => [
    { label: t`第1階段（1–24月）`, percent: "8%", amount: "6,720,000", color: "#B9D8FA", progress: 100 },
    { label: t`第2階段（25–48月）`, percent: "23%", amount: "19,320,000", color: "#2D7BEF", progress: 100 },
    { label: t`第3階段（49–72月）`, percent: "30%", amount: "25,200,000", color: "#1A5BD0", progress: 100 },
    { label: t`第4階段（73–96月）`, percent: "23%", amount: "19,320,000", color: "#5AA0F2", progress: 6.4 },
    { label: t`第5階段（97–120月）`, percent: "16%", amount: "13,440,000", color: "#8EC1F5", progress: 0 },
];

export const allocation = () => [
    { label: t`協議儲備池`, percent: "95%", amount: "79,800,000", value: 95, color: ACCENT },
    { label: t`價格保護合約池`, percent: "5%", amount: "4,200,000", value: 5, color: GOLD },
];

export const reserveRows = (unit = ""): [string, string][] => [
    [t`已使用`, `12,480,000${unit}`],
    [t`待釋放`, `67,320,000${unit}`],
    [t`使用比例`, "15.64%"],
];

export const protectionRows = (): [string, string][] => [
    [t`當前餘額`, "4,200,000"],
    [t`已使用`, "0"],
    [t`使用比例`, "0%"],
];

export type EcoPoolKey = "got2" | "aug";

export const ecoPools = () => [
    {
        key: "got2" as EcoPoolKey,
        name: t`GOT2 / GG 池`,
        a: "GOT2",
        value: "$ 18,260,450",
        delta: "+12.6%",
        apr: "12.6%",
        share: "62.3%",
        locked: "18,260,450",
        tokens: [
            { symbol: "GOT2", amount: "9,320,500", share: "50%" },
            { symbol: "GG", amount: "9,320,500", share: "50%" },
        ],
    },
    {
        key: "aug" as EcoPoolKey,
        name: t`AUG / GG 池`,
        a: "AUG",
        value: "$ 18,260,440",
        delta: "+14.8%",
        apr: "14.8%",
        share: "37.7%",
        locked: "18,260,440",
        tokens: [
            { symbol: "AUG", amount: "152,800", share: "50%" },
            { symbol: "GG", amount: "1,420,000", share: "50%" },
        ],
    },
];
