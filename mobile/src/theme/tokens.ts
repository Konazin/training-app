export const shared = {
  radius: 14,
  radii: { sm: 10, md: 14, lg: 20, xl: 28 },
  pagePadding: 24,
  spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 },
  touchTarget: { minimum: 48 },
  control: { primaryHeight: 56, compactHeight: 48 },
  /** Durações em ms. `fast` confirma um toque; `slow` move uma tela inteira. */
  motion: { fast: 120, feedback: 160, standard: 220, slow: 320 },
  /** Profundidade vem de preenchimento e linhas finas, nunca de sombra. */
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
