import { ReactNode } from "react";
import { t, Trans } from "@lingui/macro";

import Card from "src/components/Card/Card";

// 創世募資規則 - the rules card, after origin's HelixRules. The figures (total,
// per-address cap, window, daily cap, benefits) are not given yet: each one
// renders as DASH.

const DASH = "——";

function Panel({ title, children }: { title: ReactNode; children: ReactNode }) {
    return (
        <div className="gp-rule-panel">
            <div className="gp-rule-panel-title">
                <span>{title}</span>
            </div>
            {children}
        </div>
    );
}

function FundraiseRules() {
    return (
        <Card className="gp-rules">
            <div className="gp-fundraise-body">
                <div>
                    <div className="gp-rules-brand">GOLDEN PACT</div>
                    <div className="gp-rules-title">{t`創世募資`}</div>
                </div>

                <div className="gp-rules-lines">
                    <div>
                        <Trans>
                            募資總量：<b className="gp-rules-accent">{DASH} USDT</b>
                        </Trans>
                    </div>
                    <div>
                        <Trans>
                            單個地址最大限額：<b className="gp-rules-accent">{DASH} USDT</b>
                        </Trans>
                    </div>
                </div>

                <Panel title={t`募資時間`}>
                    <dl className="gp-rules-dates">
                        <dt>{t`開始時間：`}</dt>
                        <dd className="gp-rules-accent">{DASH}</dd>
                        <dt>{t`結束時間：`}</dt>
                        <dd className="gp-rules-accent">{DASH}</dd>
                    </dl>
                    <div>
                        <Trans>
                            為期 <b className="gp-rules-accent">{DASH}</b> · 每天限額：
                            <b className="gp-rules-accent">{DASH} USDT</b>
                        </Trans>
                    </div>
                </Panel>

                <Panel title={t`參與權益`}>
                    <b className="gp-rules-accent">{DASH}</b>
                </Panel>

                <Panel title={t`舉例`}>
                    <div>
                        <Trans>
                            參與 <b className="gp-rules-accent">{DASH} USDT</b>，獲得：
                            <b className="gp-rules-accent">{DASH}</b>
                        </Trans>
                    </div>
                </Panel>

                <div className="gp-rules-footer">GOLDEN PACT</div>
            </div>
        </Card>
    );
}

export default FundraiseRules;
