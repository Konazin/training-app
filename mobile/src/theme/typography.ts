export const fontFamilies = {
  text: 'Geist',
  data: 'GeistMono',
} as const

export const typography = {
  display: { fontFamily: fontFamilies.text, fontSize: 40, fontWeight: '500' as const, lineHeight: 41, letterSpacing: -1.4 },
  titleLarge: { fontFamily: fontFamilies.text, fontSize: 34, fontWeight: '500' as const, lineHeight: 36, letterSpacing: -1.2 },
  title: { fontFamily: fontFamilies.text, fontSize: 25, fontWeight: '500' as const, lineHeight: 28, letterSpacing: -0.6 },
  titleSmall: { fontFamily: fontFamilies.text, fontSize: 17, fontWeight: '600' as const, lineHeight: 22 },
  label: { fontFamily: fontFamilies.text, fontSize: 14, fontWeight: '400' as const, lineHeight: 20 },
  labelSmall: { fontFamily: fontFamilies.text, fontSize: 12, fontWeight: '400' as const, lineHeight: 16 },
  bodyLarge: { fontFamily: fontFamilies.text, fontSize: 17, fontWeight: '400' as const, lineHeight: 24 },
  body: { fontFamily: fontFamilies.text, fontSize: 15, fontWeight: '400' as const, lineHeight: 22 },
  bodySmall: { fontFamily: fontFamilies.text, fontSize: 14, fontWeight: '400' as const, lineHeight: 20 },
  caption: { fontFamily: fontFamilies.text, fontSize: 13, fontWeight: '400' as const, lineHeight: 18 },
  captionSmall: { fontFamily: fontFamilies.text, fontSize: 12, fontWeight: '400' as const, lineHeight: 16 },
  monoLabel: { fontFamily: fontFamilies.data, fontSize: 12, fontWeight: '400' as const, lineHeight: 16 },
  numberXL: { fontFamily: fontFamilies.data, fontSize: 72, fontWeight: '300' as const, lineHeight: 72, letterSpacing: -2.4 },
  numberLarge: { fontFamily: fontFamilies.data, fontSize: 32, fontWeight: '300' as const, lineHeight: 35, letterSpacing: -1 },
  numberMedium: { fontFamily: fontFamilies.data, fontSize: 20, fontWeight: '500' as const, lineHeight: 24 },
  numberSmall: { fontFamily: fontFamilies.data, fontSize: 14, fontWeight: '400' as const, lineHeight: 20 },
} as const
