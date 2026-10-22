// DOM legend next to a donut: dot, label, share, amount.

export type LegendItem = {
    label: string;
    color: string;
    percent?: string;
    amount?: string;
};

function Legend({ items }: { items: LegendItem[] }) {
    return (
        <ul className="gp-legend">
            {items.map(item => (
                <li key={item.label}>
                    <span className="gp-dot" style={{ background: item.color }} />
                    <span className="gp-legend-label">{item.label}</span>
                    {item.percent && <span className="gp-legend-pct">{item.percent}</span>}
                    {item.amount && <span className="gp-legend-amount">{item.amount}</span>}
                </li>
            ))}
        </ul>
    );
}

export default Legend;
