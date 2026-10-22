import { Bar } from "react-chartjs-2";
import type { ChartOptions } from "chart.js";

import { ChartSeries, colorFor, xAxisOptions, yAxisOptions } from "./ChartSetup";

// Grouped bars: the pool volume trend.

type Props = {
    labels: string[];
    series: ChartSeries[];
    height?: number;
    yFormat?: (value: number) => string;
};

function BarChart({ labels, series, height = 220, yFormat }: Props) {
    const data = {
        labels,
        datasets: series.map((s, i) => ({
            label: s.label,
            data: s.data,
            backgroundColor: colorFor(s, i),
            borderRadius: 4,
            maxBarThickness: 14,
        })),
    };
    const options: ChartOptions<"bar"> = {
        interaction: { mode: "index", intersect: false },
        scales: { x: xAxisOptions(), y: yAxisOptions(yFormat) },
    };
    return (
        <div className="gp-chart" style={{ height }}>
            <Bar data={data} options={options} />
        </div>
    );
}

export default BarChart;
