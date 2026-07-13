"use client";

import { alpha, createTheme, darken, lighten } from "@mui/material/styles";

// Brand colors — dark forest green as the primary accent, warm greige for
// everything else (surfaces, borders, secondary actions).
const brandGreen = "#093408";
const brandBeige = "#BFBAAD";

const theme = createTheme({
  cssVariables: { colorSchemeSelector: "class" },
  colorSchemes: {
    light: {
      palette: {
        primary: {
          main: brandGreen,
          light: lighten(brandGreen, 0.35),
          dark: darken(brandGreen, 0.3),
          contrastText: "#ffffff",
        },
        secondary: {
          main: brandBeige,
          light: lighten(brandBeige, 0.35),
          dark: darken(brandBeige, 0.25),
          contrastText: brandGreen,
        },
        background: {
          default: "#f5f3ee",
          paper: "#ffffff",
        },
        text: {
          primary: "#20261f",
          secondary: "#5c584d",
        },
        divider: alpha(brandGreen, 0.13),
      },
    },
    dark: {
      palette: {
        primary: {
          main: lighten(brandGreen, 0.55),
          light: lighten(brandGreen, 0.7),
          dark: brandGreen,
          contrastText: "#0c1c0b",
        },
        secondary: {
          main: brandBeige,
          contrastText: "#1b1a16",
        },
        background: {
          default: "#14170f",
          paper: "#1b1f16",
        },
        divider: alpha(brandBeige, 0.16),
      },
    },
  },
  shape: { borderRadius: 10 },
  typography: {
    fontFamily: "var(--font-montserrat), Montserrat, sans-serif",
    fontWeightRegular: 400,
    fontWeightMedium: 500,
    fontWeightBold: 700,
    h3: { fontWeight: 700, letterSpacing: -0.5 },
    h4: { fontWeight: 700, letterSpacing: -0.25 },
    h6: { fontWeight: 600 },
    button: { fontWeight: 600, textTransform: "none" },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          scrollbarColor: `${brandBeige} transparent`,
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: "none",
          borderBottom: `1px solid ${alpha(brandBeige, 0.35)}`,
        },
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: { borderRadius: 8, paddingInline: 16 },
        contained: {
          "&:hover": { boxShadow: "none" },
        },
        outlined: {
          borderWidth: 1.5,
          "&:hover": { borderWidth: 1.5 },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: { backgroundImage: "none" },
        elevation1: {
          boxShadow: `0 1px 2px ${alpha(brandGreen, 0.06)}, 0 4px 12px ${alpha(brandGreen, 0.07)}`,
        },
      },
    },
    MuiTableContainer: {
      styleOverrides: {
        root: {
          border: `1px solid ${alpha(brandGreen, 0.1)}`,
          borderRadius: 12,
        },
      },
    },
    MuiTableHead: {
      styleOverrides: {
        root: ({ theme }) => ({
          "& .MuiTableCell-root": {
            fontWeight: 700,
            fontSize: "0.75rem",
            letterSpacing: 0.4,
            textTransform: "uppercase",
            color: theme.palette.mode === "dark" ? brandBeige : brandGreen,
            backgroundColor:
              theme.palette.mode === "dark"
                ? alpha(brandBeige, 0.08)
                : alpha(brandBeige, 0.28),
          },
        }),
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: ({ theme }) => ({
          "&:last-of-type td": { borderBottom: "none" },
          "&:hover": {
            backgroundColor:
              theme.palette.mode === "dark"
                ? alpha(brandBeige, 0.06)
                : alpha(brandGreen, 0.035),
          },
        }),
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { fontWeight: 600, borderRadius: 6 },
      },
    },
    MuiDialogTitle: {
      styleOverrides: {
        root: { fontWeight: 700 },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: { borderRadius: 8 },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: ({ theme }) => ({
          backgroundColor: darken(brandGreen, 0.1),
          color: theme.palette.common.white,
          fontSize: "0.72rem",
        }),
      },
    },
    MuiLink: {
      defaultProps: { underline: "hover" },
    },
  },
});

export default theme;
