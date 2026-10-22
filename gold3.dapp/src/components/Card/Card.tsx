import { ReactNode } from "react";
import { Link } from "react-router-dom";

import Icon, { IconName } from "src/components/Icon/Icon";

// The glass card every board is built from. `action` is the "查看詳情 ›" link
// at the top right; without `to` it renders disabled.

type Props = {
    title?: ReactNode;
    subtitle?: ReactNode;
    icon?: IconName;
    action?: { label: string; to?: string };
    right?: ReactNode;
    className?: string;
    children?: ReactNode;
};

function Card({ title, subtitle, icon, action, right, className, children }: Props) {
    const hasHead = title || action || right;
    return (
        <section className={`gp-card ${className ?? ""}`}>
            {hasHead && (
                <header className="gp-card-head">
                    <div className="gp-card-head-text">
                        {title && (
                            <h3 className="gp-card-title">
                                {icon && (
                                    <span className="gp-icon-badge gp-icon-badge--sm">
                                        <Icon name={icon} size={18} />
                                    </span>
                                )}
                                {title}
                            </h3>
                        )}
                        {subtitle && <p className="gp-card-subtitle">{subtitle}</p>}
                    </div>
                    {right}
                    {action &&
                        (action.to ? (
                            <Link className="gp-card-action" to={action.to}>
                                {action.label}
                                <Icon name="chevronRight" size={14} />
                            </Link>
                        ) : (
                            <span className="gp-card-action is-disabled">
                                {action.label}
                                <Icon name="chevronRight" size={14} />
                            </span>
                        ))}
                </header>
            )}
            {children}
        </section>
    );
}

export default Card;
