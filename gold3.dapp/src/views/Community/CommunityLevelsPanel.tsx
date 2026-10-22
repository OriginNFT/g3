import { t } from "@lingui/macro";

import Card from "src/components/Card/Card";
import Icon, { IconName } from "src/components/Icon/Icon";
import ImageSlot from "src/components/ImageSlot/ImageSlot";
import Progress from "src/components/Progress/Progress";

// 社區等級與權益 (board 4-5), embedded in 我的社區 and on its own page.

const LEVELS = ["P1", "P2", "P3", "P4", "P5", "P6", "P7"];
const CURRENT = "P3";

function CommunityLevelsPanel() {
    const benefits: { icon: IconName; label: string }[] = [
        { icon: "pie", label: t`社區算力分潤` },
        { icon: "nft", label: t`專屬 NFT 空投` },
        { icon: "crown", label: t`生態項目優先權益` },
        { icon: "shield", label: t`治理投票權` },
        { icon: "more", label: t`更多權益` },
    ];

    return (
        <Card>
            <div className="gp-pool-head">
                <ImageSlot label="GG" shape="circle" width={64} />
                <div>
                    <h3 className="gp-card-title">{t`社區等級與權益`}</h3>
                    <p className="gp-card-subtitle">{t`了解等級要求 · 查看專屬權益`}</p>
                </div>
            </div>

            <div className="gp-level-chips">
                {LEVELS.map(level => (
                    <span key={level} className={`gp-level-chip ${level === CURRENT ? "is-active" : ""}`}>
                        {level}
                    </span>
                ))}
            </div>

            <div className="gp-subcard gp-level-current">
                <ImageSlot label={CURRENT} shape="circle" width={84} />
                <div className="gp-grow">
                    <div className="gp-row gp-between">
                        <span className="gp-strong-lg">{t`當前等級 ${CURRENT}`}</span>
                        <span className="gp-muted gp-small">
                            3,200,000 / 4,000,000 DAI <b>80%</b>
                        </span>
                    </div>
                    <Progress value={80} tone="gold" />
                    <div className="gp-muted gp-small">{t`升級至 P4 還需 800,000 DAI`}</div>
                </div>
            </div>

            <h4 className="gp-subcard-title">{t`${CURRENT} 等級要求`}</h4>
            <div className="gp-grid gp-grid-2 gp-grid-tight">
                <div className="gp-tile gp-tile--row">
                    <span className="gp-icon-badge">
                        <Icon name="community" size={20} />
                    </span>
                    <div>
                        <div className="gp-muted gp-small">{t`個人本位倉算力`}</div>
                        <div className="gp-strong-lg">5,000 DAI</div>
                    </div>
                </div>
                <div className="gp-tile gp-tile--row">
                    <span className="gp-icon-badge">
                        <Icon name="trend" size={20} />
                    </span>
                    <div>
                        <div className="gp-muted gp-small">{t`三區總算力要求`}</div>
                        <div className="gp-strong-lg">{t`每區 500,000 DAI`}</div>
                    </div>
                </div>
            </div>

            <h4 className="gp-subcard-title">{t`${CURRENT} 專屬權益`}</h4>
            <div className="gp-benefits">
                {benefits.map(benefit => (
                    <div className="gp-benefit" key={benefit.label}>
                        <span className="gp-icon-badge">
                            <Icon name={benefit.icon} size={20} />
                        </span>
                        <span className="gp-small">{benefit.label}</span>
                    </div>
                ))}
            </div>
        </Card>
    );
}

export default CommunityLevelsPanel;
