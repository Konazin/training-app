import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import type { TrainingPlan } from '../model/trainingPlan'
import { shared, type ThemeColors, useTheme } from '../../../theme'
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
  )
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  content: { padding: shared.pagePadding, paddingBottom: 45 },
  emptyContent: { flexGrow: 1 },
  card: { alignItems: 'center', backgroundColor: colors.card, borderColor: colors.gray200, borderRadius: 17, borderWidth: 1, flexDirection: 'row', gap: 10, marginBottom: 8, padding: 14 },
  name: { color: colors.ink, fontSize: 11, fontWeight: '800' },
  meta: { color: colors.gray500, fontSize: 8, marginTop: 5 },
  restore: { backgroundColor: colors.primary, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 },
  restoreText: { color: colors.onPrimary, fontSize: 8, fontWeight: '800' },
  error: { color: colors.danger, fontSize: 8, marginTop: 5 },
  empty: { alignItems: 'center', flex: 1, justifyContent: 'center', minHeight: 250 },
  emptyTitle: { color: colors.ink, fontSize: 14, fontWeight: '800' },
})
