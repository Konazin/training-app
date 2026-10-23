import { FlatList, StyleSheet, Text, View } from 'react-native'
import { RotateCcw } from 'lucide-react-native'
import type { TrainingPlan } from '../model/trainingPlan'
import { shared, type ThemeColors, useTheme } from '../../../theme'
import { Screen } from '../../../components/Screen'
import { ScreenHeader } from '../../../components/ScreenHeader'
import { fontFamilies } from '../../../theme/typography'
import { PressableScale } from '../../../motion'

export function ArchivedTrainingPlansScreen({
  plans,
  busyKeys,
  errors,
  onRestore,
}: {
  plans: TrainingPlan[]
  busyKeys: Set<string>
  errors: Record<string, string>
  onRestore: (id: number, archived: boolean) => Promise<boolean>
}) {
  const { colors } = useTheme()
  const styles = createStyles(colors)
  const archived = plans.filter((plan) => plan.archived)

  return (
    <Screen>
      <FlatList
      data={archived}
      keyExtractor={(item) => String(item.id)}
      contentContainerStyle={[styles.content, !archived.length && styles.emptyContent]}
      ListHeaderComponent={(
        <ScreenHeader
          eyebrow="Gestão de fichas"
          title="Fichas arquivadas"
          description="Restaure uma ficha antes de editar ou ativar."
        />
      )}
      ListEmptyComponent={(
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>Nenhuma ficha arquivada</Text>
        </View>
      )}
      renderItem={({ item }) => {
        const key = `plan:archive:${item.id}`
        return (
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.meta}>
                {item.category} · atualizada em {new Date(item.updatedAt).toLocaleDateString('pt-BR')}
              </Text>
              {!!errors[key] && <Text style={styles.error}>{errors[key]}</Text>}
            </View>
            <PressableScale
              accessibilityRole="button"
              accessibilityState={{ disabled: busyKeys.has(key) }}
              disabled={busyKeys.has(key)}
              style={[styles.restore, busyKeys.has(key) && styles.disabled]}
              onPress={() => void onRestore(item.id, false)}
            >
              <RotateCcw color={colors.on} size={16} />
              <Text style={styles.restoreText}>{busyKeys.has(key) ? 'Restaurando…' : 'Restaurar'}</Text>
            </PressableScale>
          </View>
        )
      }}
      />
    </Screen>
  )
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  content: { paddingHorizontal: shared.pagePadding, paddingBottom: 45 },
  emptyContent: { flexGrow: 1 },
  row: { alignItems: 'center', borderBottomColor: colors.bd, borderBottomWidth: 1, flexDirection: 'row', gap: 12, minHeight: 76, paddingVertical: 12 },
  name: { color: colors.tx, fontFamily: fontFamilies.text, fontSize: 16, fontWeight: '500', lineHeight: 22 },
  meta: { color: colors.t2, fontFamily: fontFamilies.text, fontSize: 14, lineHeight: 20, marginTop: 5 },
  restore: { alignItems: 'center', backgroundColor: colors.ac, borderRadius: 12, flexDirection: 'row', gap: 6, justifyContent: 'center', minHeight: 48, paddingHorizontal: 12 },
  disabled: { opacity: 0.55 },
  restoreText: { color: colors.on, fontFamily: fontFamilies.text, fontSize: 14, fontWeight: '500' },
  error: { color: colors.dg, fontFamily: fontFamilies.text, fontSize: 12, lineHeight: 16, marginTop: 5 },
  empty: { alignItems: 'center', flex: 1, justifyContent: 'center', minHeight: 250 },
  emptyTitle: { color: colors.tx, fontFamily: fontFamilies.text, fontSize: 14, fontWeight: '500' },
})
