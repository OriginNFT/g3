import { Link } from "react-router-dom";
import { t } from "@lingui/macro";

import Card from "src/components/Card/Card";
import Icon from "src/components/Icon/Icon";
import KvList from "src/components/KvList/KvList";
import Legend from "src/components/Legend/Legend";
import PageHeader from "src/components/PageHeader/PageHeader";
import DonutChart from "src/components/charts/DonutChart";
import { allocation, protectionRows, reserveRows } from "./mock";

// 資金分配總覽 - the allocation detail board.

function AllocationDetail() {
    return (
        <div className="gp-stack">
            <PageHeader title={t`資金分配總覽`} back="/overview" />

            <Card>
                <div className="gp-donut-row">
                    <DonutChart items={allocation()} size={220}>
                        <div className="gp-donut-value">84,000,000</div>
                        <div className="gp-donut-label">{t`GG 總量`}</div>
                    </DonutChart>
                    <Legend items={allocation()} />
                </div>
            </Card>

            <div className="gp-grid gp-grid-2">
                <Card title={t`協議儲備池`} icon="drop">
                    <div className="gp-figure-row">
                        <span className="gp-figure">79,800,000</span>
                        <span className="gp-figure-pct">95%</span>
                    </div>
                    <p className="gp-muted gp-small">{t`用於生態建設、算力排放、流動性支持等`}</p>
                    <KvList rows={reserveRows()} className="gp-kv--boxed" />
                    <Link className="gp-btn gp-btn-soft gp-btn-block" to="/overview/reserve">
                        {t`查看詳情`}
                        <Icon name="arrowRight" size={16} />
                    </Link>
                </Card>

                <Card title={t`價格保護合約池`} icon="shield">
                    <div className="gp-figure-row">
                        <span className="gp-figure">4,200,000</span>
                        <span className="gp-figure-pct">5%</span>
                    </div>
                    <p className="gp-muted gp-small">{t`用於價格保護及市場調節`}</p>
                    <KvList rows={protectionRows()} className="gp-kv--boxed" />
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
