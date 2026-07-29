import { useMemo, useState } from 'react'
import { FlatList, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import type { ExerciseDefinition } from '../../../models/training'
import { SelectableChip } from '../../../components/SelectableChip'
import { shared, type ThemeColors, useTheme } from '../../../theme'

export function ExercisePicker({
  exercises,
  excludedId,
  onSelect,
}: {
  exercises: ExerciseDefinition[]
  excludedId?: number
  onSelect: (exercise: ExerciseDefinition) => void
}) {
  const { colors } = useTheme()
  const styles = createStyles(colors)
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('')
  const available = useMemo(
    () => exercises.filter((exercise) => !exercise.archived && exercise.id !== excludedId),
    [excludedId, exercises],
  )
  const categories = useMemo(
    () => [...new Set(available.map((exercise) => exercise.category))],
    [available],
  )
  const normalizedQuery = query.trim().toLocaleLowerCase('pt-BR')
  const filtered = available.filter((exercise) => {
    const matchesQuery = !normalizedQuery || [
      exercise.name,
      exercise.primaryMuscleGroup,
      exercise.equipment,
    ].some((value) => value.toLocaleLowerCase('pt-BR').includes(normalizedQuery))
    return matchesQuery && (!category || exercise.category === category)
  })

  return (
    <FlatList
      data={filtered}
      keyExtractor={(item) => String(item.id)}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={[styles.content, !filtered.length && styles.emptyContent]}
      ListHeaderComponent={(
        <View>
          <TextInput
            accessibilityLabel="Buscar exercício"
            placeholder="Nome, grupo muscular ou equipamento"
            placeholderTextColor={colors.gray400}
            style={styles.search}
            value={query}
            onChangeText={setQuery}
          />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categories}>
            <Filter label="Todas" active={!category} onPress={() => setCategory('')} />
            {categories.map((item) => (
              <Filter
                key={item}
                label={item}
                active={category === item}
                onPress={() => setCategory(category === item ? '' : item)}
              />
            ))}
          </ScrollView>
        </View>
      )}
      ListEmptyComponent={(
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>Nenhum exercício encontrado</Text>
          <Text style={styles.emptyText}>Altere a busca ou o filtro.</Text>
        </View>
      )}
      renderItem={({ item }) => (
        <TouchableOpacity accessibilityRole="button" style={styles.item} onPress={() => onSelect(item)}>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.meta}>{item.primaryMuscleGroup} · {item.equipment}</Text>
          </View>
          <Text style={styles.arrow}>→</Text>
        </TouchableOpacity>
      )}
    />
  )
}

function Filter({
  label,
  active,
  onPress,
}: {
  label: string
  active: boolean
  onPress: () => void
}) {
  return <SelectableChip label={label} selected={active} onPress={onPress} />
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  content: { paddingHorizontal: shared.pagePadding, paddingBottom: 45 },
  emptyContent: { flexGrow: 1 },
  search: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 15, borderWidth: 1, color: colors.textPrimary, fontSize: 16, marginBottom: 10, minHeight: 56, paddingHorizontal: 16 },
  categories: { marginBottom: 12 },
  item: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 16, borderWidth: 1, flexDirection: 'row', marginBottom: 7, minHeight: 68, padding: 13 },
  name: { color: colors.textPrimary, fontSize: 16, fontWeight: '800', lineHeight: 22 },
  meta: { color: colors.textSecondary, fontSize: 14, lineHeight: 20, marginTop: 4 },
  arrow: { color: colors.gray400, fontSize: 17 },
  empty: { alignItems: 'center', flex: 1, justifyContent: 'center', minHeight: 230 },
  emptyTitle: { color: colors.ink, fontSize: 14, fontWeight: '800' },
  emptyText: { color: colors.gray500, fontSize: 12, marginTop: 5 },
})
