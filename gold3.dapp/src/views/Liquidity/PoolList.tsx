import { t } from "@lingui/macro";

import Card from "src/components/Card/Card";
import PageHeader from "src/components/PageHeader/PageHeader";
import PoolTable from "./PoolTable";

// 流動性池列表 · 管理 - the pool list board (3-4).

function PoolList() {
    return (
        <div className="gp-stack">
            <PageHeader title={t`流動性池列表`} subtitle={t`查看與管理所有生態流動性池`} back="/liquidity" />
            <Card>
                <PoolTable />
            </Card>
        </div>
    );
}

export default PoolList;
