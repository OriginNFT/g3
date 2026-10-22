import { Line } from "react-chartjs-2";
import type { ChartOptions } from "chart.js";

import { ACCENT } from "src/themes/tokens";
import { withAlpha } from "./ChartSetup";

// Axis-less trend line inside a KPI tile (GG price).

type Props = {
    data: number[];
    color?: string;
    width?: number | string;
    height?: number;
};

function Sparkline({ data, color = ACCENT, width = 110, height = 44 }: Props) {
    const chartData = {
        labels: data.map((_, i) => String(i)),
        datasets: [
            {
                data,
                borderColor: color,
                backgroundColor: withAlpha(color, 0.12),
                fill: "origin" as const,
                tension: 0.4,
                pointRadius: 0,
                borderWidth: 2,
            },
        ],
    };
    const options: ChartOptions<"line"> = {
        plugins: { tooltip: { enabled: false } },
        scales: { x: { display: false }, y: { display: false } },
        animation: false,
    };
    return (
        <div className="gp-sparkline" style={{ width, height }}>
            <Line data={chartData} options={options} />
        </div>
    );
}

export default Sparkline;
