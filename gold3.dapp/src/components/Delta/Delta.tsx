// Green / red change pill ("+12.6%").

function Delta({ value, suffix }: { value: string; suffix?: string }) {
    const negative = value.trim().startsWith("-");
    return (
        <span className={`gp-delta ${negative ? "is-negative" : ""}`}>
            {value}
            {suffix && <span className="gp-delta-suffix">{suffix}</span>}
        </span>
    );
}

export default Delta;
