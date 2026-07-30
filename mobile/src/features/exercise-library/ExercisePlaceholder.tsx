import { StyleSheet, Text, View } from 'react-native'
import type { ExercisePlaceholderKind } from '@training/training-domain'
import { type ThemeColors, useTheme } from '../../theme'

const labels: Record<ExercisePlaceholderKind, { symbol: string; label: string }> = {
  STRENGTH: { symbol: '◆', label: 'Força' },
  MOBILITY: { symbol: '⌁', label: 'Mobilidade' },
  CARDIO: { symbol: '↟', label: 'Condicionamento' },
  BODYWEIGHT: { symbol: '○', label: 'Peso corporal' },
  EQUIPMENT: { symbol: '▰', label: 'Equipamento' },
}

export function ExercisePlaceholder({
  kind,
  compact = false,
  missing = false,
}: {
  kind: ExercisePlaceholderKind
  compact?: boolean
  missing?: boolean
}) {
  const { colors } = useTheme()
  const styles = createStyles(colors)
  const content = labels[kind]
  return (
    <View
      accessibilityLabel={missing
        ? 'Mídia indisponível. Ilustração genérica do aplicativo.'
        : `Ilustração genérica de ${content.label}. Não demonstra a técnica do exercício.`}
      style={[styles.container, compact && styles.compact]}
    >
      <Text accessibilityElementsHidden style={[styles.symbol, compact && styles.compactSymbol]}>{content.symbol}</Text>
      {!compact && (
        <>
          <Text style={styles.label}>{missing ? 'Mídia indisponível' : content.label}</Text>
          <Text style={styles.hint}>Ilustração genérica — não orienta técnica</Text>
        </>
      )}
    </View>
  )
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    alignItems: 'center',
    aspectRatio: 16 / 9,
    backgroundColor: colors.surfaceSecondary,
    borderColor: colors.border,
    borderRadius: 18,
    borderWidth: 1,
    justifyContent: 'center',
    overflow: 'hidden',
    width: '100%',
  },
  compact: { aspectRatio: 1, borderRadius: 14, height: 52, width: 52 },
  symbol: { color: colors.primary, fontSize: 36, fontWeight: '900' },
  compactSymbol: { fontSize: 22 },
  label: { color: colors.textPrimary, fontSize: 14, fontWeight: '900', marginTop: 8 },
  hint: { color: colors.textSecondary, fontSize: 12, marginTop: 4 },
})
