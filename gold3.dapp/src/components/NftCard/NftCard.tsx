import { t } from "@lingui/macro";

import ImageSlot from "src/components/ImageSlot/ImageSlot";
import KvList from "src/components/KvList/KvList";

// 黃金聖甲蟲 card: vertical on the NFT page, horizontal in My Assets.

export type NftItem = {
    key: string;
    name: string;
    available: boolean;
    quota: string;
    method: string;
    time: string;
};

export function NftStatus({ available }: { available: boolean }) {
    return <span className={`gp-status ${available ? "is-ok" : "is-used"}`}>{available ? t`可用` : t`已使用`}</span>;
}

type Props = {
    nft: NftItem;
    layout?: "vertical" | "horizontal";
    selected?: boolean;
    onClick?: () => void;
};

function NftCard({ nft, layout = "vertical", selected = false, onClick }: Props) {
    const vertical = layout === "vertical";
    return (
        <div className={`gp-nft-card gp-nft-card--${layout} ${selected ? "is-selected" : ""}`} onClick={onClick}>
            <div className="gp-nft-art">
                <ImageSlot
                    label={t`黃金聖甲蟲`}
                    shape="rounded"
                    width={vertical ? "100%" : 96}
                    height={vertical ? 150 : 96}
                    tone={nft.available ? "gold" : "dark"}
                />
                {vertical && <NftStatus available={nft.available} />}
            </div>
            <div className="gp-nft-body">
                <div className="gp-nft-name">
                    <span>{nft.name}</span>
                    {!vertical && <NftStatus available={nft.available} />}
                </div>
                <KvList
                    compact
                    rows={[
                        [t`權益額度`, nft.quota],
                        [t`獲取方式`, nft.method],
                        [t`獲取時間`, nft.time],
                    ]}
                />
            </div>
        </div>
    );
}

export default NftCard;
