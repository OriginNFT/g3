// Design tokens for the places that need a JS value (MUI, RainbowKit, Chart.js).
// src/style.scss carries the same values as --gp-* custom properties: change a
// value in both places, never in one only.
//
// Light only - no board has a dark variant.

export const NAVY = "#0D2A5E";
export const ACCENT = "#2D7BEF";
export const ACCENT_DEEP = "#1A5BD0";
export const GOLD = "#E7B54A";

export const PAGE_BG = "#EAF3FD";
export const SURFACE = "#FFFFFF";
export const BORDER = "#DCE7F6";

export const TEXT_PRIMARY = "#13284B";
export const TEXT_SECONDARY = "#6A7A93";

export const POSITIVE = "#1E9E62";
export const NEGATIVE = "#D9534F";
export const WARNING = "#E39B2D";

export const RADIUS_CARD = 16;
export const RADIUS_CONTROL = 10;

export const FONT_FAMILY =
    '-apple-system, BlinkMacSystemFont, "PingFang TC", "Noto Sans TC", "Microsoft JhengHei", "Segoe UI", Roboto, sans-serif';
export const SERIF_FAMILY = '"Songti TC", "Noto Serif TC", "PMingLiU", Georgia, serif';

// ============ charts ============

/** Index order is the series order across every chart. */
export const CHART_SERIES = [ACCENT, "#F2C14E", "#8EC1F5", ACCENT_DEEP, "#F6DFA1"];
export const CHART_GRID = "#E6EEF9";
export const CHART_AXIS_TEXT = "#8494AD";

// ============ layout ============

export const SIDEBAR_WIDTH = 200;
/** Below this the sidebar gives way to the drawer. Mirrors the 1100px cut in style.scss. */
export const BREAKPOINT_DESKTOP = 1100;
