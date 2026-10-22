import { Skeleton } from "@mui/material";
import { t } from "@lingui/macro";

import Card from "src/components/Card/Card";
import PageHeader from "src/components/PageHeader/PageHeader";

// 本位倉算力 - no board yet: the page is shown disabled, never hidden.

function Power() {
    return (
        <div className="gp-stack">
            <PageHeader title={t`本位倉算力`} />

            <div className="gp-grid gp-grid-4 is-disabled">
                {[0, 1, 2, 3].map(i => (
                    <div className="gp-card gp-stat" key={i}>
                        <Skeleton variant="circular" width={48} height={48} />
                        <div className="gp-stat-body">
                            <Skeleton width="60%" />
                            <Skeleton width="80%" height={32} />
                        </div>
                    </div>
                ))}
            </div>

            <Card className="is-disabled">
                <Skeleton variant="rounded" height={260} />
                <div className="gp-empty">{t`即將開放`}</div>
            </Card>
        </div>
    );
}

export default Power;
