import { ReactNode } from "react";
import { t, Trans } from "@lingui/macro";

import Card from "src/components/Card/Card";

// 創世募資規則 - the rules card, after origin's HelixRules. The total, the
// per-address cap and the start time come from Gold3Fundraise (DASH until
// read); the end, the benefits and the example are the launch announcement's
// (2026-10-22): sold out ends it, 2.5x Power, 20% NFT production rights.

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

type Props = {
    targetText: string;
    maxText: string;
    startText: string;
};

function FundraiseRules({ targetText, maxText, startText }: Props) {
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
                            募資總量：<b className="gp-rules-accent">{targetText}</b>
                        </Trans>
                    </div>
                    <div>
                        <Trans>
                            單個地址最大限額：<b className="gp-rules-accent">{maxText}</b>
                        </Trans>
                    </div>
                </div>

                <Panel title={t`募資時間`}>
                    <dl className="gp-rules-dates">
                        <dt>{t`開始時間：`}</dt>
                        <dd className="gp-rules-accent">{startText}</dd>
                        <dt>{t`結束時間：`}</dt>
                        <dd className="gp-rules-accent">{t`募滿即止`}</dd>
                    </dl>
                </Panel>

                <Panel title={t`參與權益`}>
                    <div>
                        <Trans>
                            算力權益：參與金額的 <b className="gp-rules-accent">2.5 倍</b>
                        </Trans>
                    </div>
                    <div>
                        <Trans>
                            NFT 生產權益：參與金額的 <b className="gp-rules-accent">20%</b>
                        </Trans>
                    </div>
                </Panel>

                <Panel title={t`舉例`}>
                    <div>
                        <Trans>
                            參與 <b className="gp-rules-accent">1,000 USDT</b>，即可獲得：
                        </Trans>
                    </div>
                    <div>
                        <Trans>
                            <b className="gp-rules-accent">2,500 USDT</b> 金本位算力權益
                        </Trans>
                    </div>
                    <div>
                        <Trans>
                            <b className="gp-rules-accent">200 USDT</b> 等值 NFT 生產權益
                        </Trans>
                    </div>
                </Panel>

                <div className="gp-rules-footer">GOLDEN PACT</div>
            </div>
        </Card>
    );
}

export default FundraiseRules;
