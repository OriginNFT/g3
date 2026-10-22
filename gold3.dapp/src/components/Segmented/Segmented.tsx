// Pill toggle of the boards (7D / 30D / 90D, 24h / 7D / 30D). Visual only for now.

type Props = {
    options: string[];
    value: string;
    onChange: (value: string) => void;
};

function Segmented({ options, value, onChange }: Props) {
    return (
        <div className="gp-segmented">
            {options.map(option => (
                <button
                    key={option}
                    type="button"
                    className={option === value ? "is-active" : ""}
                    onClick={() => onChange(option)}
                >
                    {option}
                </button>
            ))}
        </div>
    );
}

export default Segmented;
