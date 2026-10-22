import { CSSProperties } from "react";

// Stand-in for the design artwork (logo, scarab, coins, banners), which is not
// in the repo yet. Replace with <img src="/..."> once the assets are in public/.

type Props = {
    label: string;
    shape?: "circle" | "rounded" | "rect";
    width?: number | string;
    height?: number | string;
    tone?: "gold" | "blue" | "dark";
    className?: string;
    style?: CSSProperties;
};

function ImageSlot({ label, shape = "rounded", width = 64, height, tone = "gold", className, style }: Props) {
    return (
        <div
            className={`gp-image-slot gp-image-slot--${shape} gp-image-slot--${tone} ${className ?? ""}`}
            style={{ width, height: height ?? width, ...style }}
            title={label}
        >
            <span>{label}</span>
        </div>
    );
}

export default ImageSlot;
