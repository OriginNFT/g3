import { Line } from "react-chartjs-2";
import type { ChartOptions } from "chart.js";

import { ChartSeries, colorFor, withAlpha, xAxisOptions, yAxisOptions } from "./ChartSetup";

// Area line chart: the emission curve, the liquidity share trend (stacked).

type Props = {
    labels: string[];
    series: ChartSeries[];
    height?: number;
    stacked?: boolean;
    yFormat?: (value: number) => string;
    yMax?: number;
};

function LineChart({ labels, series, height = 220, stacked = false, yFormat, yMax }: Props) {
    const data = {
        labels,
        datasets: series.map((s, i) => {
            const color = colorFor(s, i);
            return {
                label: s.label,
                data: s.data,
                borderColor: color,
                backgroundColor: withAlpha(color, stacked ? 0.55 : 0.18),
                fill: stacked ? (i === 0 ? "origin" : "-1") : "origin",
                tension: 0.35,
                pointRadius: stacked ? 0 : 3,
                pointBackgroundColor: color,
                borderWidth: 2,
            };
        }),
    };
    const y = yAxisOptions(yFormat);
    const options: ChartOptions<"line"> = {
        interaction: { mode: "index", intersect: false },
        scales: {
            x: xAxisOptions(),
            y: { ...y, stacked, ...(yMax !== undefined ? { max: yMax } : {}) },
        },
    };
    return (
        <div className="gp-chart" style={{ height }}>
            <Line data={data} options={options} />
        </div>
    );
}

export default LineChart;
