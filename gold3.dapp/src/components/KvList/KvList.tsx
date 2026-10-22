import { ReactNode } from "react";

// Label / value rows inside a card (已使用 12,480,000 ...).

type Props = {
    rows: [ReactNode, ReactNode][];
    compact?: boolean;
    className?: string;
};

function KvList({ rows, compact = false, className }: Props) {
    return (
        <dl className={`gp-kv ${compact ? "gp-kv--compact" : ""} ${className ?? ""}`}>
            {rows.map(([label, value], i) => (
                <div className="gp-kv-row" key={i}>
                    <dt>{label}</dt>
                    <dd>{value}</dd>
                </div>
            ))}
        </dl>
    );
}

export default KvList;
