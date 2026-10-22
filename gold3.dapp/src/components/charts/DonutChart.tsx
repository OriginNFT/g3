import { ReactNode } from "react";
import { Doughnut } from "react-chartjs-2";
import type { ChartOptions } from "chart.js";

import { colorFor } from "./ChartSetup";

// Thick ring with the headline figure in the hole (DOM, not canvas).

export type DonutItem = {
    label: string;
    value: number;
    color?: string;
};

type Props = {
    items: DonutItem[];
    size?: number;
    cutout?: string;
    children?: ReactNode;
};

function DonutChart({ items, size = 180, cutout = "72%", children }: Props) {
    const data = {
        labels: items.map(item => item.label),
        datasets: [
            {
                data: items.map(item => item.value),
                backgroundColor: items.map((item, i) => colorFor(item, i)),
                borderWidth: 0,
                hoverOffset: 4,
            },
        ],
    };
    const options: ChartOptions<"doughnut"> = {
        cutout,
        animation: { duration: 400 },
    };
    return (
        <div className="gp-donut" style={{ width: size, height: size }}>
            <Doughnut data={data} options={options} />
            {children && <div className="gp-donut-center">{children}</div>}
        </div>
    );
}

export default DonutChart;
