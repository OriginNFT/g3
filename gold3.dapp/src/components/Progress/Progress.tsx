// Thin rounded progress bar. `value` is a percentage, 0-100.

type Props = {
    value: number;
    tone?: "blue" | "gold";
    className?: string;
};

function Progress({ value, tone = "blue", className }: Props) {
    const width = Math.max(0, Math.min(100, value));
    return (
        <div className={`gp-progress gp-progress--${tone} ${className ?? ""}`}>
            <div className="gp-progress-fill" style={{ width: `${width}%` }} />
        </div>
    );
}

export default Progress;
