import { Link } from "react-router-dom";
import { t } from "@lingui/macro";

import Card from "src/components/Card/Card";
import Icon from "src/components/Icon/Icon";
import KvList from "src/components/KvList/KvList";
import Legend from "src/components/Legend/Legend";
import PageHeader from "src/components/PageHeader/PageHeader";
import DonutChart from "src/components/charts/DonutChart";
import { gg, pct, usdt, useAllocationItems } from "./useOverviewData";

// 資金分配總覽 - the allocation detail board: the three AllocationVault
// buckets of the 84M GG, and the two USDT vaults fed by the 本位倉.

function AllocationDetail() {
    const { data: d, legend } = useAllocationItems();

    const reserveRows: [string, string][] = [
        [t`累計存入`, `${usdt(d.reserveDeposited)} USDT`],
        [t`累計提出`, `${usdt(d.reserveWithdrawn)} USDT`],
        [t`使用比例`, `${pct(d.reserveWithdrawn, d.reserveDeposited).toFixed(2)}%`],
    ];
    const protectionRows: [string, string][] = [
        [t`累計存入`, `${usdt(d.protectionDeposited)} USDT`],
        [t`已使用`, `${usdt(d.protectionSpent)} USDT`],
        [t`使用比例`, `${pct(d.protectionSpent, d.protectionDeposited).toFixed(2)}%`],
    ];

    return (
        <div className="gp-stack">
            <PageHeader title={t`資金分配總覽`} back="/overview" />

            <Card>
                <div className="gp-donut-row">
                    <DonutChart items={legend} size={220}>
                        <div className="gp-donut-value">{gg(d.totalSupply)}</div>
                        <div className="gp-donut-label">{t`GG 總量`}</div>
                    </DonutChart>
                    <Legend items={legend} />
                </div>
            </Card>

            <div className="gp-grid gp-grid-2">
                <Card title={t`協議儲備池`} icon="drop">
                    <div className="gp-figure-row">
                        <span className="gp-figure">{usdt(d.reserveBalance)}</span>
                        <span className="gp-figure-pct">USDT</span>
                    </div>
                    <p className="gp-muted gp-small">{t`本位倉 USDT 的 95%，用於生態建設、流動性支持等`}</p>
                    <KvList rows={reserveRows} className="gp-kv--boxed" />
                    <Link className="gp-btn gp-btn-soft gp-btn-block" to="/overview/reserve">
                        {t`查看詳情`}
                        <Icon name="arrowRight" size={16} />
                    </Link>
                </Card>

                <Card title={t`價格保護合約池`} icon="shield">
                    <div className="gp-figure-row">
                        <span className="gp-figure">{usdt(d.protectionBalance)}</span>
                        <span className="gp-figure-pct">USDT</span>
                    </div>
                    <p className="gp-muted gp-small">{t`本位倉 USDT 的 5%，用於價格保護及市場調節`}</p>
                    <KvList rows={protectionRows} className="gp-kv--boxed" />
                    <button type="button" className="gp-btn gp-btn-soft gp-btn-block" disabled>
                        {t`查看詳情`}
                        <Icon name="arrowRight" size={16} />
                    </button>
                </Card>
            </div>
        </div>
    );
}

export default AllocationDetail;
