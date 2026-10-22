// Coloured disc with the symbol, until the token logos are in public/.

const COLORS: { [symbol: string]: string } = {
    GG: "#D9A43B",
    GOT2: "#1F7A66",
    AUG: "#B98A2E",
    DAI: "#F4B731",
    USDT: "#26A17B",
    ETH: "#627EEA",
};

type Props = {
    symbol: string;
    size?: number;
};

function TokenIcon({ symbol, size = 28 }: Props) {
    return (
        <span
            className="gp-token-icon"
            style={{
                width: size,
                height: size,
                background: COLORS[symbol] ?? "#8494AD",
                fontSize: Math.max(8, Math.round(size * 0.32)),
            }}
        >
            {symbol.slice(0, 4)}
        </span>
    );
}

/** Two overlapping token discs for a pair ("GG / USDT"). */
export function PairIcon({ a, b, size = 28 }: { a: string; b: string; size?: number }) {
    return (
        <span className="gp-pair-icon">
            <TokenIcon symbol={a} size={size} />
            <TokenIcon symbol={b} size={size} />
        </span>
    );
}

export default TokenIcon;
