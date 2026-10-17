import { StyleSheet, Text, View } from 'react-native'
import { Activity, Circle, Dumbbell, MoveUpRight, Package } from 'lucide-react-native'
import type { ExercisePlaceholderKind } from '@training/training-domain'
import { type ThemeColors, useTheme } from '../../theme'
import { fontFamilies } from '../../theme/typography'

const contentByKind = {
  STRENGTH: { Icon: Dumbbell, label: 'Força' },
  MOBILITY: { Icon: MoveUpRight, label: 'Mobilidade' },
  CARDIO: { Icon: Activity, label: 'Condicionamento' },
  BODYWEIGHT: { Icon: Circle, label: 'Peso corporal' },
  EQUIPMENT: { Icon: Package, label: 'Equipamento' },
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
  const { Icon, label } = contentByKind[kind]
  return (
    <View
      accessibilityLabel={missing
        ? 'Mídia indisponível. Ilustração genérica do aplicativo.'
        : `Ilustração genérica de ${label}. Não demonstra a técnica do exercício.`}
      style={[styles.container, compact && styles.compact]}
    >
      <View accessibilityElementsHidden>
        <Icon color={colors.mu} size={compact ? 21 : 38} strokeWidth={1.4} />
      </View>
      {!compact && (
        <>
          <Text style={styles.label}>{missing ? 'Mídia indisponível' : label}</Text>
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
    backgroundColor: colors.s2,
    borderRadius: 8,
    justifyContent: 'center',
    overflow: 'hidden',
    width: '100%',
  },
  compact: { aspectRatio: 1, height: 48, width: 48 },
  label: { color: colors.tx, fontFamily: fontFamilies.text, fontSize: 14, fontWeight: '500', marginTop: 8 },
  hint: { color: colors.t2, fontFamily: fontFamilies.text, fontSize: 12, marginTop: 4 },
})
