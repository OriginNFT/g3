import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { t } from "@lingui/macro";

import Icon from "src/components/Icon/Icon";

// Serif page title with its tagline; `back` adds the "← 返回" link of the detail boards.

export function BackLink({ to }: { to: string }) {
    return (
        <Link className="gp-back" to={to}>
            <Icon name="arrowLeft" size={16} />
            {t`返回`}
        </Link>
    );
}

type Props = {
    title: ReactNode;
    subtitle?: ReactNode;
    back?: string;
    right?: ReactNode;
};

function PageHeader({ title, subtitle, back, right }: Props) {
    return (
        <div className="gp-page-header">
            <div className="gp-page-header-text">
                {back && <BackLink to={back} />}
                <h1 className="gp-page-title">{title}</h1>
                {subtitle && <p className="gp-page-subtitle">{subtitle}</p>}
            </div>
            {right && <div className="gp-page-header-right">{right}</div>}
        </div>
    );
}

export default PageHeader;
