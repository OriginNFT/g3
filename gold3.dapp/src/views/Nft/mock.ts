import { t } from "@lingui/macro";

import type { NftItem } from "src/components/NftCard/NftCard";

// The three 黃金聖甲蟲 of the NFT and My Assets boards.

export const myNfts = (): NftItem[] => [
    { key: "001", name: t`黃金聖甲蟲 #001`, available: true, quota: "10,000 USDT", method: t`銷毀 GG`, time: "2026-10-01" },
    { key: "002", name: t`黃金聖甲蟲 #002`, available: true, quota: "10,000 USDT", method: t`銷毀 GOT2`, time: "2026-09-25" },
    { key: "003", name: t`黃金聖甲蟲 #003`, available: false, quota: "10,000 USDT", method: t`銷毀 GG`, time: "2026-09-18" },
];

export const NFT_CONTRACT_DISPLAY = "0x3a5D...8F2e";
