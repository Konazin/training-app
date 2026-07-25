import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native'
import { type ThemeColors, useTheme } from '../theme'

interface Props {
  label: string
  onPress: () => void
  loading?: boolean
  secondary?: boolean
}

export function PrimaryButton({ label, onPress, loading, secondary }: Props) {
  const { colors } = useTheme()
  const styles = createStyles(colors)
  return (
    <Pressable
      disabled={loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        secondary && styles.secondary,
        pressed && styles.pressed,
        loading && styles.disabled,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={secondary ? colors.black : colors.white} />
      ) : (
        <Text style={[styles.label, secondary && styles.secondaryLabel]}>{label}</Text>
      )}
    </Pressable>
  )
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  button: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 16,
    justifyContent: 'center',
    minHeight: 54,
    paddingHorizontal: 18,
  },
  secondary: {
    backgroundColor: colors.card,
    borderColor: colors.gray200,
    borderWidth: 1,
  },
  label: {
    color: colors.onPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  secondaryLabel: {
    color: colors.ink,
  },
  pressed: {
    opacity: 0.75,
  },
  disabled: {
    opacity: 0.45,
  },
})
