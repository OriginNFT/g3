import { useState } from "react";
import { MenuItem, Select } from "@mui/material";
import { t } from "@lingui/macro";

import Card from "src/components/Card/Card";
import Icon from "src/components/Icon/Icon";
import KvList from "src/components/KvList/KvList";
import PageHeader from "src/components/PageHeader/PageHeader";
import TokenIcon from "src/components/TokenIcon/TokenIcon";
import { LIQUIDITY_PAIRS } from "./mock";

// 添加流動性 / 移除流動性 - the add / remove board (3-5). Inputs are inert and
// the submit buttons disabled until the contracts are wired.

function AmountField({ symbol }: { symbol?: string }) {
    return (
        <div className="gp-amount">
            {symbol && (
                <div className="gp-amount-token">
                    <TokenIcon symbol={symbol} size={32} />
                    <span className="gp-strong">{symbol}</span>
                </div>
            )}
            <input className="gp-amount-input" placeholder="0.0" inputMode="decimal" />
            <button type="button" className="gp-btn gp-btn-outline gp-btn-sm" disabled>
                MAX
            </button>
            {symbol && <div className="gp-amount-balance">{t`餘額`}: 0.0</div>}
        </div>
    );
}

function AddRemoveLiquidity() {
    const [pair, setPair] = useState(LIQUIDITY_PAIRS[0]);
    const [tokenA, tokenB] = pair.split(" / ");

    return (
        <div className="gp-stack">
            <PageHeader title={t`添加流動性 / 移除流動性`} back="/liquidity" />

            <div className="gp-grid gp-grid-3-2">
                <Card
                    title={t`添加流動性`}
                    right={
                        <div className="gp-row">
                            <span className="gp-muted gp-small">{t`交易對`}</span>
                            <Select size="small" value={pair} onChange={e => setPair(e.target.value)}>
                                {LIQUIDITY_PAIRS.map(p => (
                                    <MenuItem key={p} value={p}>
                                        {p}
                                    </MenuItem>
                                ))}
                            </Select>
                        </div>
                    }
                >
                    <div className="gp-muted gp-small">{t`添加資產`}</div>
                    <AmountField symbol={tokenA} />
                    <div className="gp-plus">
                        <Icon name="plus" size={18} />
                    </div>
                    <AmountField symbol={tokenB} />
                    <KvList
                        rows={[
                            [t`預估獲得 LP 代幣`, "0.0"],
                            [t`預計池子佔比`, "0.00%"],
                            [t`滑點容忍度`, "0.5%"],
                        ]}
                    />
                    <button type="button" className="gp-btn gp-btn-gold gp-btn-block" disabled>
                        {t`添加流動性`}
                    </button>
                </Card>

                <Card title={t`移除流動性`}>
                    <div className="gp-muted gp-small">{t`LP 代幣數量`}</div>
                    <AmountField />
                    <div className="gp-btn-row">
                        {["25%", "50%", "75%", "100%"].map(p => (
                            <button type="button" className="gp-btn gp-btn-outline gp-btn-sm" disabled key={p}>
                                {p}
                            </button>
                        ))}
                    </div>
                    <div className="gp-muted gp-small">{t`預計獲得`}</div>
                    <div className="gp-token-rows">
                        {[tokenA, tokenB].map(symbol => (
                            <div className="gp-token-row" key={symbol}>
                                <TokenIcon symbol={symbol} />
                                <span className="gp-strong gp-grow">{symbol}</span>
                                <span>0.0</span>
                            </div>
                        ))}
                    </div>
                    <button type="button" className="gp-btn gp-btn-primary gp-btn-block" disabled>
                        {t`移除流動性`}
                    </button>
                </Card>
            </div>
        </div>
    );
}

export default AddRemoveLiquidity;
