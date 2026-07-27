import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { ScreenHeader } from '../components/ScreenHeader'
import { shared, type ThemeColors, useTheme } from '../theme'

export function MoreScreen({
  onOpen,
}: {
  onOpen: (screen: 'Workouts' | 'Library' | 'Exercise' | 'UmaCareer') => void
}) {
  const { colors } = useTheme()
  const styles = createStyles(colors)
  return (
    <View style={styles.content}>
      <ScreenHeader
        eyebrow="Organização"
        title="Mais"
        description="Acesse ferramentas usadas com menos frequência."
      />
      <MenuItem label="Modo Umamusume" onPress={() => onOpen('UmaCareer')} />
      <MenuItem label="Treinos legados" onPress={() => onOpen('Workouts')} />
      <MenuItem label="Biblioteca de exercícios" onPress={() => onOpen('Library')} />
      <MenuItem label="Configurar exercício" onPress={() => onOpen('Exercise')} />
    </View>
  )
}

function MenuItem({ label, onPress }: { label: string; onPress: () => void }) {
  const { colors } = useTheme()
  const styles = createStyles(colors)
  return (
    <TouchableOpacity style={styles.item} onPress={onPress}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.arrow}>→</Text>
    </TouchableOpacity>
  )
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  content: { flex: 1, padding: shared.pagePadding, paddingBottom: 110 },
  item: {
    alignItems: 'center',
    backgroundColor: colors.card,
    borderColor: colors.gray200,
    borderRadius: 17,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    minHeight: 58,
    paddingHorizontal: 16,
  },
  label: { color: colors.ink, fontSize: 11, fontWeight: '700' },
  arrow: { color: colors.gray500, fontSize: 17 },
})
