import { ReactNode } from "react";

import Icon, { IconName } from "src/components/Icon/Icon";
import Delta from "src/components/Delta/Delta";

// KPI tile: gold icon badge, label, figure, optional delta pill and footer.

type Props = {
    icon?: IconName;
    badge?: ReactNode;
    label: ReactNode;
    value: ReactNode;
    unit?: ReactNode;
    delta?: string;
    footer?: ReactNode;
    className?: string;
};

function StatCard({ icon, badge, label, value, unit, delta, footer, className }: Props) {
    return (
        <div className={`gp-card gp-stat ${className ?? ""}`}>
            {(badge || icon) && (
                <div className="gp-stat-icon">{badge ?? <span className="gp-icon-badge">{icon && <Icon name={icon} size={22} />}</span>}</div>
            )}
            <div className="gp-stat-body">
                <div className="gp-stat-label">{label}</div>
                <div className="gp-stat-value">
                    {value}
                    {unit && <span className="gp-stat-unit">{unit}</span>}
                </div>
                {delta && <Delta value={delta} />}
                {footer}
            </div>
        </div>
    );
}

export default StatCard;
