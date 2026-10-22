import { useState } from "react";
import { t } from "@lingui/macro";

import Card from "src/components/Card/Card";
import Icon, { IconName } from "src/components/Icon/Icon";
import ImageSlot from "src/components/ImageSlot/ImageSlot";
import PageHeader from "src/components/PageHeader/PageHeader";
import Tabs from "src/components/Tabs/Tabs";

// 官方文檔 - the docs board (4-8). No document content or social links yet:
// every 查看文檔 and both social cards are disabled.

type Category = "protocol" | "rules" | "faq" | "news";
type Tab = "all" | Category;

type Doc = {
    category: Category;
    title: string;
    desc: string;
    cover?: { label: string; tone: "gold" | "blue" | "dark" };
    icon?: IconName;
};

function Docs() {
    const [tab, setTab] = useState<Tab>("all");

    const categoryLabel: { [c in Category]: string } = {
        protocol: t`協議文檔`,
        rules: t`規則說明`,
        faq: t`常見問題`,
        news: t`最新公告`,
    };

    const docs: Doc[] = [
        {
            category: "protocol",
            title: t`GG 黃金協議白皮書`,
            desc: t`完整了解 GG 黃金協議的願景、機制與經濟模型。`,
            cover: { label: t`白皮書`, tone: "dark" },
        },
        {
            category: "rules",
            title: t`協議規則說明`,
            desc: t`產品機制、參與規則、收益分配等詳細說明。`,
            cover: { label: t`規則說明`, tone: "dark" },
        },
        {
            category: "faq",
            title: t`常見問題（FAQ）`,
            desc: t`精選社區高頻問題與官方解答，快速了解關鍵內容。`,
            cover: { label: "FAQ", tone: "blue" },
        },
        {
            category: "news",
            title: t`官方公告`,
            desc: t`查看項目最新動態、重要通知與執行進展。`,
            cover: { label: t`公告`, tone: "gold" },
        },
        { category: "protocol", title: t`經濟模型簡版`, desc: t`GG 三幣模型與核心機制概覽。`, icon: "chart" },
        { category: "rules", title: t`收益機制說明`, desc: t`收益來源、分配邏輯與計算方式。`, icon: "sprout" },
        { category: "rules", title: t`風險提示`, desc: t`參與前需了解的風險說明與注意事項。`, icon: "shield" },
        { category: "faq", title: t`術語詞典`, desc: t`關鍵詞術語解釋，幫助快速理解協議內容。`, icon: "book" },
    ];

    const shown = docs.filter(doc => tab === "all" || doc.category === tab);

    return (
        <div className="gp-stack">
            <PageHeader
                title={t`官方文檔`}
                subtitle={t`了解協議機制 · 掌握最新動態`}
                right={
                    <div className="gp-row gp-wrap">
                        <div className="gp-card gp-social-card is-disabled">
                            <span className="gp-social-icon gp-social-icon--x">
                                <Icon name="x" size={22} />
                            </span>
                            <div className="gp-grow">
                                <div className="gp-strong">{t`關注 X`}</div>
                                <div className="gp-muted gp-small">{t`獲取最新動態`}</div>
                            </div>
                            <Icon name="arrowRight" size={16} />
                        </div>
                        <div className="gp-card gp-social-card is-disabled">
                            <span className="gp-social-icon gp-social-icon--tg">
                                <Icon name="telegram" size={22} />
                            </span>
                            <div className="gp-grow">
                                <div className="gp-strong">{t`加入 Telegram`}</div>
                                <div className="gp-muted gp-small">{t`參與社區交流`}</div>
                            </div>
                            <Icon name="arrowRight" size={16} />
                        </div>
                    </div>
                }
            />

            <Card>
                <Tabs
                    tabs={[
                        { key: "all", label: t`全部文檔` },
                        { key: "protocol", label: categoryLabel.protocol },
                        { key: "rules", label: categoryLabel.rules },
                        { key: "faq", label: categoryLabel.faq },
                        { key: "news", label: categoryLabel.news },
                    ]}
                    value={tab}
                    onChange={setTab}
                />

                <div className="gp-grid gp-grid-4 gp-docs-grid">
                    {shown.map(doc => (
                        <div className="gp-subcard gp-doc-card" key={doc.title}>
                            {doc.cover && (
                                <ImageSlot label={doc.cover.label} shape="rounded" width="100%" height={150} tone={doc.cover.tone} />
                            )}
                            <div className={doc.icon ? "gp-row gp-top" : ""}>
                                {doc.icon && (
                                    <span className="gp-icon-badge gp-icon-badge--lg">
                                        <Icon name={doc.icon} size={26} />
                                    </span>
                                )}
                                <div>
                                    <div className="gp-strong-lg">{doc.title}</div>
                                    <span className="gp-chip">{categoryLabel[doc.category]}</span>
                                </div>
                            </div>
                            <p className="gp-muted gp-small gp-grow">{doc.desc}</p>
                            <button type="button" className="gp-btn gp-btn-outline gp-btn-block" disabled>
                                <Icon name="docs" size={16} />
                                {t`查看文檔`}
                                <Icon name="arrowRight" size={14} />
                            </button>
                        </div>
                    ))}
                </div>
            </Card>
        </div>
    );
}

export default Docs;
