// Filled-pill tab row of the boards (全部資產 / 代幣資產 / ...).

type Props<T extends string> = {
    tabs: { key: T; label: string }[];
    value: T;
    onChange: (value: T) => void;
    variant?: "pill" | "underline";
};

function Tabs<T extends string>({ tabs, value, onChange, variant = "pill" }: Props<T>) {
    return (
        <div className={`gp-tabs gp-tabs--${variant}`}>
            {tabs.map(tab => (
                <button
                    key={tab.key}
                    type="button"
                    className={tab.key === value ? "is-active" : ""}
                    onClick={() => onChange(tab.key)}
                >
                    {tab.label}
                </button>
            ))}
        </div>
    );
}

export default Tabs;
