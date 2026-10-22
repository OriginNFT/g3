import { Link } from "react-router-dom";
import { t } from "@lingui/macro";

import Delta from "src/components/Delta/Delta";
import Icon from "src/components/Icon/Icon";
import ImageSlot from "src/components/ImageSlot/ImageSlot";
import TokenIcon from "src/components/TokenIcon/TokenIcon";
import { EcoPool } from "./mock";

// One ecosystem pool on the liquidity main board.

function PoolCard({ pool }: { pool: EcoPool }) {
    return (
        <div className="gp-subcard gp-pool-card">
            <div className="gp-pool-head">
                <ImageSlot label={pool.art} shape="circle" width={68} />
                <div className="gp-grow">
                    <div className="gp-pool-name">{pool.name}</div>
                    <div className="gp-row">
                        <span className="gp-figure gp-accent">{pool.value}</span>
                        <Delta value={pool.delta} />
                    </div>
                </div>
                <Link className="gp-round-link gp-round-link--gold" to={`/liquidity/${pool.key}`}>
                    <Icon name="chevronRight" size={16} />
                </Link>
            </div>

            <div className="gp-token-rows">
                {pool.tokens.map(token => (
                    <div className="gp-token-row" key={token.symbol}>
                        <TokenIcon symbol={token.symbol} />
                        <span className="gp-strong">{token.symbol}</span>
                        <span className="gp-grow gp-right">{token.amount}</span>
                        <span className="gp-muted">{token.usd}</span>
                        <span className="gp-chip">{token.share}</span>
                    </div>
                ))}
            </div>

            <div className="gp-grid gp-grid-3 gp-grid-tight">
                <div className="gp-tile gp-center">
                    <div className="gp-muted gp-small">{t`年化收益（參考）`}</div>
                    <div className="gp-strong">{pool.apr}</div>
                </div>
                <div className="gp-tile gp-center">
                    <div className="gp-muted gp-small">{t`24h 交易量`}</div>
                    <div className="gp-strong">{pool.volume24h}</div>
                </div>
                <div className="gp-tile gp-center">
                    <div className="gp-muted gp-small">{t`流動性佔比`}</div>
                    <div className="gp-strong">{pool.share}</div>
                </div>
            </div>

            <Link className="gp-btn gp-btn-gold gp-btn-block" to="/liquidity/add">
                {t`添加流動性`}
            </Link>
        </div>
    );
}

export default PoolCard;
