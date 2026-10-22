import {
    ArcElement,
    BarController,
    BarElement,
    CategoryScale,
    Chart,
    DoughnutController,
    Filler,
    LineController,
    LineElement,
    LinearScale,
    PointElement,
    Tooltip,
} from "chart.js";

import { formatCompact } from "src/helpers/format";
import { CHART_AXIS_TEXT, CHART_GRID, CHART_SERIES, FONT_FAMILY } from "src/themes/tokens";

// The one place chart.js is configured. Legends are DOM in the cards, so the
// Legend plugin is not registered.

Chart.register(
    BarController,
    BarElement,
    LineController,
    LineElement,
    PointElement,
    DoughnutController,
    ArcElement,
    CategoryScale,
    LinearScale,
    Filler,
    Tooltip,
);

Chart.defaults.font.family = FONT_FAMILY;
Chart.defaults.font.size = 11;
Chart.defaults.color = CHART_AXIS_TEXT;
Chart.defaults.responsive = true;
// Every wrapper sizes its canvas box in CSS instead.
Chart.defaults.maintainAspectRatio = false;

export type ChartSeries = {
    label: string;
    data: number[];
    color?: string;
};

export function seriesColor(index: number): string {
    return CHART_SERIES[index % CHART_SERIES.length];
}

/** A series' own colour when it set one, its palette slot otherwise. */
export function colorFor(series: { color?: string }, index: number): string {
    return series.color ?? seriesColor(index);
}

/** "#2D7BEF" -> "rgba(45, 123, 239, 0.24)". Non-hex input is returned as is. */
export function withAlpha(color: string, alpha: number): string {
    const match = /^#([0-9a-f]{6})$/i.exec(color.trim());
    if (!match) return color;
    const value = parseInt(match[1], 16);
    return `rgba(${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255}, ${alpha})`;
}

export function xAxisOptions() {
    return {
        grid: { display: false },
        border: { display: false },
        ticks: { color: CHART_AXIS_TEXT, maxRotation: 0, autoSkip: true },
    };
}

export function yAxisOptions(format: (value: number) => string = formatCompact) {
    return {
        beginAtZero: true,
        grid: { color: CHART_GRID, drawTicks: false },
        border: { display: false },
        ticks: {
            color: CHART_AXIS_TEXT,
            padding: 8,
            maxTicksLimit: 5,
            callback: (value: string | number) => format(Number(value)),
        },
    };
}
