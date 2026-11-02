import { alpha, createTheme } from '@mui/material/styles';

// Built to match gp.admin and dao3.admin, which run the Minimal (minimals.cc)
// MUI template. Operators move between these panels, so they should feel like
// one product rather than three projects.
//
// The parts of that language worth copying, and why they are what they are:
//   * the cool grey ramp built around #919EAB, with every divider, hover and
//     disabled state derived from it by alpha rather than picked separately
//   * dashed hairlines — nav edge, header edge, table rows, dialog seams. It is
//     the template's most recognisable detail and it separates without the
//     weight of a solid rule
//   * cards carried by a two-layer soft shadow instead of a border, on a canvas
//     a shade off white
//   * normal-case labels at 14px semibold in secondary ink; no micro-caps
//
// What is deliberately NOT copied:
//   * Public Sans / Barlow. Both are webfont dependencies, and this panel has
//     none — the system stack keeps the weights and sizes below without adding
//     one. Swapping it in is a one-line change if the exact face matters.
//   * gp's teal primary (#00A76F). The accent here is the GOLDEN PACT gold so the
//     panel reads as this product; everything structural is shared.
export const GREY = {
    0: '#FFFFFF',
    100: '#F9FAFB',
    200: '#F4F6F8',
    300: '#DFE3E8',
    400: '#C4CDD5',
    500: '#919EAB',
    600: '#637381',
    700: '#454F5B',
    800: '#212B36',
    900: '#161C24',
};

// GOLDEN PACT's gold IS primary.main: a dark enough gold to carry white text
// at full strength, so the brand colour itself does the interactive work. The
// ramp either side of it is the usual four steps, tinted towards white and
// towards black.
export const BRAND = '#A16A08';
const PRIMARY = {
    lighter: '#F6E9C9',
    light: '#D4A33A',
    main: BRAND,
    dark: '#7A4F05',
    darker: '#4D3203',
    contrastText: '#FFFFFF',
};

export const CANVAS = GREY[100];
export const NEUTRAL = GREY[200];
export const DIVIDER = alpha(GREY[500], 0.2);

// Two layers: a hairline that does the job a 1px border would, and a wide soft
// drop that lifts the card off the canvas.
export const CARD_SHADOW = `0 0 2px 0 ${alpha(GREY[500], 0.2)}, 0 12px 24px -4px ${alpha(GREY[500], 0.12)}`;

export const DASHED = `dashed 1px ${DIVIDER}`;

// Menlo/Consolas rather than the generic keyword: the browser default for
// `monospace` is Courier on a surprising number of machines, and an address in
// Courier is genuinely harder to compare character by character.
export const MONO = 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace';

const SANS = 'system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

export const theme = createTheme({
    palette: {
        mode: 'light',
        primary: PRIMARY,
        secondary: { light: '#E0C27A', main: '#B8860B', dark: '#7A5A08', contrastText: '#FFFFFF' },
        info: { light: '#61F3F3', main: '#00B8D9', dark: '#006C9C', contrastText: '#FFFFFF' },
        success: { light: '#77ED8B', main: '#22C55E', dark: '#118D57', contrastText: '#FFFFFF' },
        warning: { light: '#FFD666', main: '#FFAB00', dark: '#B76E00', contrastText: GREY[800] },
        error: { light: '#FFAC82', main: '#FF5630', dark: '#B71D18', contrastText: '#FFFFFF' },
        grey: GREY,
        divider: DIVIDER,
        text: { primary: GREY[800], secondary: GREY[600], disabled: GREY[500] },
        background: { paper: '#FFFFFF', default: CANVAS, neutral: NEUTRAL },
        action: {
            active: GREY[600],
            hover: alpha(GREY[500], 0.08),
            selected: alpha(GREY[500], 0.16),
            disabled: alpha(GREY[500], 0.8),
            disabledBackground: alpha(GREY[500], 0.24),
            focus: alpha(GREY[500], 0.24),
            hoverOpacity: 0.08,
            disabledOpacity: 0.48,
        },
    },

    shape: { borderRadius: 8 },

    typography: {
        fontFamily: SANS,
        fontWeightMedium: 500,
        fontWeightSemiBold: 600,
        fontWeightBold: 700,
        h4: { fontWeight: 700, lineHeight: 1.5, fontSize: '1.5rem' },
        h5: { fontWeight: 700, lineHeight: 1.5, fontSize: '1.125rem' },
        h6: { fontWeight: 600, lineHeight: 1.55, fontSize: '1.0625rem' },
        subtitle1: { fontWeight: 600, lineHeight: 1.5 },
        subtitle2: { fontWeight: 600, lineHeight: 1.57, fontSize: '0.875rem' },
        body2: { lineHeight: 1.57, fontSize: '0.875rem' },
        caption: { lineHeight: 1.5, fontSize: '0.75rem' },
        button: { fontWeight: 700, textTransform: 'none' },
    },

    components: {
        MuiCssBaseline: {
            styleOverrides: {
                body: {
                    WebkitFontSmoothing: 'antialiased',
                    // Not from the template, and kept anyway: equal-width digits
                    // are what let a column of amounts be compared by eye rather
                    // than read one at a time. This panel is mostly columns of
                    // amounts.
                    fontVariantNumeric: 'tabular-nums lining-nums',
                },
                // Confirmation dialogs quote the exact value about to be signed
                // inside <code>. It has to look like a literal, not like prose.
                code: {
                    fontFamily: MONO,
                    fontSize: '0.82em',
                    padding: '1px 5px',
                    borderRadius: 6,
                    background: alpha(GREY[500], 0.12),
                    wordBreak: 'break-all',
                },
                '::selection': { background: alpha(BRAND, 0.3) },
                '*::-webkit-scrollbar': { width: 10, height: 10 },
                '*::-webkit-scrollbar-thumb': {
                    background: GREY[400],
                    borderRadius: 8,
                    border: `2px solid ${CANVAS}`,
                },
                '*::-webkit-scrollbar-thumb:hover': { background: GREY[500] },
                '*::-webkit-scrollbar-track': { background: 'transparent' },
            },
        },

        MuiAppBar: {
            styleOverrides: {
                // colorDefault as well as root: the Layout mounts the bar with
                // color="default", whose own class would otherwise paint over
                // this and leave the blur sitting on an opaque background.
                root: { color: GREY[800] },
                colorDefault: {
                    background: alpha('#FFFFFF', 0.85),
                    backdropFilter: 'blur(10px)',
                    color: GREY[800],
                    borderBottom: DASHED,
                },
            },
        },

        MuiDrawer: {
            styleOverrides: {
                paper: { background: '#FFFFFF', borderRight: DASHED },
            },
        },

        MuiPaper: {
            defaultProps: { elevation: 0 },
            styleOverrides: {
                root: { backgroundImage: 'none' },
                // Every card in the panel is <Paper variant="outlined">, so this
                // one override converts the whole surface to the template's
                // shadow-carried card without touching a single page.
                outlined: {
                    border: 'none',
                    boxShadow: CARD_SHADOW,
                    borderRadius: 16,
                },
            },
        },

        MuiTableCell: {
            styleOverrides: {
                root: {
                    borderBottomStyle: 'dashed',
                    fontVariantNumeric: 'tabular-nums lining-nums',
                },
                // Normal case at 14px, the template's way. No micro-caps — which
                // also keeps camelCase contract names in a header legible.
                head: {
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    color: GREY[600],
                    background: NEUTRAL,
                    whiteSpace: 'nowrap',
                    borderBottom: 'none',
                },
                sizeSmall: { padding: '10px 12px' },
            },
        },

        MuiTableRow: {
            styleOverrides: {
                root: {
                    '&.Mui-selected': {
                        background: alpha(PRIMARY.main, 0.06),
                        '&:hover': { background: alpha(PRIMARY.main, 0.1) },
                    },
                    // The last row's rule would otherwise draw against the
                    // card's own edge.
                    '&:last-of-type td, &:last-of-type th': { borderColor: 'transparent' },
                },
            },
        },

        MuiButton: {
            styleOverrides: {
                root: { borderRadius: 8 },
                sizeSmall: { padding: '4px 10px' },
                // Colour-matched soft shadows, replacing MUI's default grey
                // elevation. Left on rather than disabled, because a contained
                // button that floats is how the template signals "this is the
                // action on this card".
                contained: { boxShadow: `0 8px 16px 0 ${alpha(GREY[500], 0.24)}` },
                containedPrimary: { boxShadow: `0 8px 16px 0 ${alpha(PRIMARY.main, 0.24)}` },
                containedError: { boxShadow: `0 8px 16px 0 ${alpha('#FF5630', 0.24)}` },
                outlined: { borderColor: alpha(GREY[500], 0.32) },
                text: { '&:hover': { background: alpha(GREY[500], 0.08) } },
            },
        },

        MuiChip: {
            styleOverrides: {
                root: { borderRadius: 8, fontWeight: 500 },
                sizeSmall: { height: 24 },
                outlined: { borderColor: alpha(GREY[500], 0.32) },
            },
        },

        MuiOutlinedInput: {
            styleOverrides: {
                root: {
                    '& .MuiOutlinedInput-notchedOutline': { borderColor: alpha(GREY[500], 0.2) },
                    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: GREY[800] },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                        borderColor: GREY[800],
                        borderWidth: 1,
                    },
                    '&.Mui-disabled .MuiOutlinedInput-notchedOutline': { borderColor: alpha(GREY[500], 0.16) },
                },
                input: { fontVariantNumeric: 'tabular-nums lining-nums' },
            },
        },

        MuiListItemButton: {
            styleOverrides: {
                root: {
                    borderRadius: 8,
                    marginInline: 8,
                    width: 'auto',
                    // The template's active nav: a soft primary wash with
                    // primary ink, not a grey highlight.
                    '&.Mui-selected, &.active': {
                        background: alpha(PRIMARY.main, 0.08),
                        color: PRIMARY.main,
                        '&:hover': { background: alpha(PRIMARY.main, 0.14) },
                    },
                },
            },
        },

        MuiAlert: {
            styleOverrides: {
                root: { borderRadius: 8 },
                standardInfo: { background: alpha('#00B8D9', 0.12), color: '#006C9C' },
                standardWarning: { background: alpha('#FFAB00', 0.14), color: '#B76E00' },
                standardError: { background: alpha('#FF5630', 0.12), color: '#B71D18' },
                standardSuccess: { background: alpha('#22C55E', 0.12), color: '#118D57' },
            },
        },

        MuiDialog: {
            styleOverrides: {
                paper: { borderRadius: 16, boxShadow: `-40px 40px 80px -8px ${alpha('#000000', 0.24)}` },
            },
        },

        MuiDialogTitle: {
            styleOverrides: { root: { fontSize: '1.125rem', fontWeight: 700, padding: '24px 24px 16px' } },
        },

        MuiDialogActions: {
            styleOverrides: { root: { padding: 24, borderTop: DASHED } },
        },

        MuiTooltip: {
            styleOverrides: {
                tooltip: { background: GREY[800], borderRadius: 8, fontSize: '0.75rem', padding: '6px 10px' },
                arrow: { color: GREY[800] },
            },
        },

        MuiLinearProgress: {
            styleOverrides: {
                root: { height: 3, background: alpha(GREY[500], 0.16), borderRadius: 3 },
                bar: { borderRadius: 3 },
            },
        },

        MuiDivider: {
            styleOverrides: { root: { borderStyle: 'dashed', borderColor: DIVIDER } },
        },
    },
});
