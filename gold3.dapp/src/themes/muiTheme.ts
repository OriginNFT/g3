import { createTheme } from "@mui/material";

import {
    ACCENT,
    BORDER,
    FONT_FAMILY,
    GOLD,
    NEGATIVE,
    PAGE_BG,
    POSITIVE,
    RADIUS_CONTROL,
    SURFACE,
    TEXT_PRIMARY,
    TEXT_SECONDARY,
    WARNING,
} from "./tokens";

const muiTheme = createTheme({
    palette: {
        mode: "light",
        primary: { main: ACCENT, contrastText: "#FFFFFF" },
        secondary: { main: GOLD },
        success: { main: POSITIVE },
        error: { main: NEGATIVE },
        warning: { main: WARNING },
        background: { default: PAGE_BG, paper: SURFACE },
        text: { primary: TEXT_PRIMARY, secondary: TEXT_SECONDARY },
        divider: BORDER,
    },
    shape: {
        borderRadius: RADIUS_CONTROL,
    },
    typography: {
        fontFamily: FONT_FAMILY,
        button: { textTransform: "none", fontWeight: 600 },
    },
    components: {
        MuiCssBaseline: {
            styleOverrides: {
                // The page ground is the sky gradient in style.scss.
                body: { backgroundColor: PAGE_BG },
            },
        },
    },
});

export default muiTheme;
