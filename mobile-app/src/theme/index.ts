// Tokens transcribed from stitch_design/.../fleetsure_design_system/DESIGN.md
// — the source Tailwind config those HTML mockups use, translated to plain
// values since React Native has no Tailwind layer to read them from.
export const colors = {
  surface: "#fbf8ff",
  surfaceDim: "#dbd9e2",
  surfaceBright: "#fbf8ff",
  surfaceContainerLowest: "#ffffff",
  surfaceContainerLow: "#f5f2fb",
  surfaceContainer: "#efedf5",
  surfaceContainerHigh: "#e9e7f0",
  surfaceContainerHighest: "#e3e1ea",
  onSurface: "#1b1b21",
  onSurfaceVariant: "#454652",
  outline: "#767683",
  outlineVariant: "#c6c5d4",
  primary: "#001276",
  onPrimary: "#ffffff",
  primaryContainer: "#1e2d8e",
  onPrimaryContainer: "#8e9bff",
  inversePrimary: "#bcc3ff",
  secondary: "#505f76",
  onSecondary: "#ffffff",
  secondaryContainer: "#d0e1fb",
  onSecondaryContainer: "#54647a",
  tertiaryContainer: "#692100",
  onTertiaryContainer: "#f0865d",
  error: "#ba1a1a",
  onError: "#ffffff",
  errorContainer: "#ffdad6",
  onErrorContainer: "#93000a",
  background: "#fbf8ff",
  onBackground: "#1b1b21",
  // Semantic status colors used directly in the Stitch mockups (chips etc.)
  success: "#137333",
  successBg: "#e6f4ea",
  warning: "#c5221f",
  warningBg: "#fce8e6",
  // Amber/orange — used for maintenance warnings
  amber: "#e65c00",
  amberBg: "#fff3e0",
  // Clear danger red — used for insurance/compliance due
  danger: "#b71c1c",
  dangerBg: "#ffebee",
  whatsapp: "#25d366",
} as const;

export const spacing = {
  containerMargin: 16,
  stackGap: 12,
  sectionGap: 24,
  cardPadding: 16,
  touchTargetMin: 48,
} as const;

export const radii = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
} as const;

export const type = {
  headlineLg: { fontSize: 24, lineHeight: 32, fontWeight: "700" as const },
  headlineMd: { fontSize: 20, lineHeight: 28, fontWeight: "600" as const },
  headlineSm: { fontSize: 18, lineHeight: 24, fontWeight: "600" as const },
  headlineLgMobile: { fontSize: 20, lineHeight: 28, fontWeight: "700" as const },
  bodyLg: { fontSize: 16, lineHeight: 24, fontWeight: "400" as const },
  bodyMd: { fontSize: 14, lineHeight: 20, fontWeight: "400" as const },
  labelMd: { fontSize: 12, lineHeight: 16, fontWeight: "600" as const, letterSpacing: 0.5 },
  currencyDisplay: { fontSize: 20, lineHeight: 28, fontWeight: "700" as const },
} as const;

export const shadow = {
  card: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  nav: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 8,
  },
} as const;

export function formatCurrency(amount: number): string {
  return "₹ " + Math.round(amount).toLocaleString("en-IN");
}
