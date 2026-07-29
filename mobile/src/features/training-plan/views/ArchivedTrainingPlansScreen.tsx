import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import type { TrainingPlan } from '../model/trainingPlan'
import { shared, type ThemeColors, useTheme } from '../../../theme'
import { Screen } from '../../../components/Screen'
import { ScreenHeader } from '../../../components/ScreenHeader'

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
          <View style={styles.card}>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.meta}>
                {item.category} · atualizada em {new Date(item.updatedAt).toLocaleDateString('pt-BR')}
              </Text>
              {!!errors[key] && <Text style={styles.error}>{errors[key]}</Text>}
            </View>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityState={{ disabled: busyKeys.has(key) }}
              disabled={busyKeys.has(key)}
              style={styles.restore}
              onPress={() => void onRestore(item.id, false)}
            >
              <Text style={styles.restoreText}>{busyKeys.has(key) ? 'Restaurando…' : 'Restaurar'}</Text>
            </TouchableOpacity>
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
  card: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 17, borderWidth: 1, flexDirection: 'row', gap: 12, marginBottom: 8, minHeight: 76, padding: 16 },
  name: { color: colors.textPrimary, fontSize: 16, fontWeight: '800', lineHeight: 22 },
  meta: { color: colors.textSecondary, fontSize: 14, lineHeight: 20, marginTop: 5 },
  restore: { alignItems: 'center', backgroundColor: colors.primary, borderRadius: 12, justifyContent: 'center', minHeight: 48, paddingHorizontal: 12 },
  restoreText: { color: colors.onPrimary, fontSize: 14, fontWeight: '800' },
  error: { color: colors.danger, fontSize: 12, lineHeight: 16, marginTop: 5 },
  empty: { alignItems: 'center', flex: 1, justifyContent: 'center', minHeight: 250 },
  emptyTitle: { color: colors.ink, fontSize: 14, fontWeight: '800' },
})
