export const shared = {
  radius: 20,
  radii: { sm: 14, md: 18, lg: 22, xl: 26 },
  pagePadding: 20,
  spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32 },
  touchTarget: { minimum: 48 },
  control: { primaryHeight: 54, compactHeight: 48 },
  motion: { fast: 150, standard: 200, slow: 250 },
  shadow: {
    subtle: {
      elevation: 2,
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.16,
      shadowRadius: 10,
    },
    elevated: {
      elevation: 5,
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.22,
      shadowRadius: 22,
    },
  },
  screen: { horizontalPadding: 20, topSpacing: 16, bottomSpacing: 120 },
  responsive: { twoColumnGap: 12, metricMinWidth: 128 },
} as const
