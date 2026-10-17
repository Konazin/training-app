export const shared = {
  radius: 12,
  radii: { sm: 8, md: 12, lg: 12, xl: 24 },
  pagePadding: 24,
  spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 24, xxxl: 32 },
  touchTarget: { minimum: 48 },
  control: { primaryHeight: 56, compactHeight: 48 },
  motion: { fast: 80, feedback: 160, standard: 200, slow: 280 },
  shadow: {
    subtle: {
      elevation: 0,
      shadowColor: 'transparent',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0,
      shadowRadius: 0,
    },
    elevated: {
      elevation: 0,
      shadowColor: 'transparent',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0,
      shadowRadius: 0,
    },
  },
  screen: { horizontalPadding: 24, topSpacing: 16, bottomSpacing: 96 },
  responsive: { twoColumnGap: 16, metricMinWidth: 128 },
} as const
