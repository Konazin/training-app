import { useMemo, useRef, useState } from 'react'
import { FlatList, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { EXERCISE_PACKS, type ExerciseDefinition } from '@training/training-domain'
import { SelectableChip } from '../../../components/SelectableChip'
import { ThemedTextInput } from '../../../components/ThemedTextInput'
import { shared, type ThemeColors, useTheme } from '../../../theme'
import {
  filterExerciseLibrary,
  exerciseMediaLabel,
  libraryEmptyMessage,
  type LibraryFilter,
} from '../../exercise-library/libraryState'

export function ExercisePicker({
  exercises,
  excludedId,
  onFavorite,
  onSelect,
}: {
  exercises: ExerciseDefinition[]
  excludedId?: number
  onFavorite?: (id: number, favorite: boolean) => Promise<boolean>
  onSelect: (exercise: ExerciseDefinition) => void
}) {
  const { colors } = useTheme()
  const styles = createStyles(colors)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<LibraryFilter>({ kind: 'ALL' })
  const lastSelection = useRef({ id: 0, at: 0 })
  const available = useMemo(
    () => exercises.filter((exercise) => !exercise.archived && exercise.id !== excludedId),
    [excludedId, exercises],
  )
  const muscles = useMemo(
    () => [...new Set(available.map((exercise) => exercise.primaryMuscleGroup))].sort(),
    [available],
  )
  const equipment = useMemo(
    () => [...new Set(available.map((exercise) => exercise.equipment))].sort(),
    [available],
  )
  const filtered = useMemo(
    () => filterExerciseLibrary(available, query, filter),
    [available, filter, query],
  )
  const select = (exercise: ExerciseDefinition) => {
    const now = Date.now()
    if (lastSelection.current.id === exercise.id && now - lastSelection.current.at < 800) return
    lastSelection.current = { id: exercise.id, at: now }
    onSelect(exercise)
  }

  return (
    <FlatList
      data={filtered}
      keyExtractor={(item) => String(item.id)}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={[styles.content, !filtered.length && styles.emptyContent]}
      ListHeaderComponent={(
        <View>
          <ThemedTextInput
            accessibilityLabel="Buscar exercício"
            placeholder="Nome, alias, músculo ou equipamento"
            style={styles.search}
            value={query}
            onChangeText={setQuery}
          />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categories}>
            <Filter label="Todos" value={{ kind: 'ALL' }} selected={filter} onSelect={setFilter} />
            <Filter label="Favoritos" value={{ kind: 'FAVORITES' }} selected={filter} onSelect={setFilter} />
            <Filter label="Recentes" value={{ kind: 'RECENTS' }} selected={filter} onSelect={setFilter} />
            <Filter label="Peso corporal" value={{ kind: 'BODYWEIGHT' }} selected={filter} onSelect={setFilter} />
          </ScrollView>
          <Text style={styles.groupLabel}>PACOTES</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categories}>
            {EXERCISE_PACKS.map((pack) => (
              <Filter key={pack.id} label={pack.name} value={{ kind: 'PACK', value: pack.id }} selected={filter} onSelect={setFilter} />
            ))}
          </ScrollView>
          <Text style={styles.groupLabel}>GRUPO MUSCULAR</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categories}>
            {muscles.map((muscle) => <Filter key={muscle} label={muscle} value={{ kind: 'MUSCLE', value: muscle }} selected={filter} onSelect={setFilter} />)}
          </ScrollView>
          <Text style={styles.groupLabel}>EQUIPAMENTO</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categories}>
            {equipment.map((item) => <Filter key={item} label={item} value={{ kind: 'EQUIPMENT', value: item }} selected={filter} onSelect={setFilter} />)}
          </ScrollView>
        </View>
      )}
      ListEmptyComponent={(
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>{libraryEmptyMessage(available.length, query, filter)}</Text>
          <Text style={styles.emptyText}>Altere a busca ou o filtro.</Text>
        </View>
      )}
      renderItem={({ item }) => (
        <View style={styles.item}>
          <TouchableOpacity
            accessibilityLabel={`Adicionar ${item.name}`}
            accessibilityRole="button"
            onPress={() => select(item)}
            style={styles.itemMain}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.meta}>
                {item.primaryMuscleGroup} · {item.equipment} · {exerciseMediaLabel(item)}
              </Text>
            </View>
            <Text style={styles.arrow}>→</Text>
          </TouchableOpacity>
          {!!onFavorite && (
            <Pressable
              accessibilityLabel={item.favorite ? `Remover ${item.name} dos favoritos` : `Favoritar ${item.name}`}
              accessibilityRole="button"
              accessibilityState={{ selected: item.favorite }}
              onPress={() => void onFavorite(item.id, !item.favorite)}
              style={styles.favorite}
            >
              <Text style={styles.favoriteText}>{item.favorite ? '★' : '☆'}</Text>
            </Pressable>
          )}
        </View>
      )}
    />
  )
}

function Filter({
  label,
  value,
  selected,
  onSelect,
}: {
  label: string
  value: LibraryFilter
  selected: LibraryFilter
  onSelect: (value: LibraryFilter) => void
}) {
  const active = value.kind === selected.kind
    && (!('value' in value) || ('value' in selected && value.value === selected.value))
  return <SelectableChip label={label} selected={active} onPress={() => onSelect(active ? { kind: 'ALL' } : value)} />
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  content: { paddingHorizontal: shared.pagePadding, paddingBottom: 45 },
  emptyContent: { flexGrow: 1 },
  search: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 15, borderWidth: 1, color: colors.textPrimary, fontSize: 16, marginBottom: 10, minHeight: 56, paddingHorizontal: 16 },
  categories: { gap: 8, marginBottom: 12, paddingRight: 12 },
  groupLabel: { color: colors.textSecondary, fontSize: 12, fontWeight: '900', marginBottom: 6 },
  item: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 16, borderWidth: 1, flexDirection: 'row', marginBottom: 7, minHeight: 68 },
  itemMain: { alignItems: 'center', flex: 1, flexDirection: 'row', minHeight: 68, padding: 13 },
  name: { color: colors.textPrimary, fontSize: 16, fontWeight: '800', lineHeight: 22 },
  meta: { color: colors.textSecondary, fontSize: 14, lineHeight: 20, marginTop: 4 },
  arrow: { color: colors.gray400, fontSize: 17 },
  favorite: { alignItems: 'center', justifyContent: 'center', minHeight: 48, minWidth: 48 },
  favoriteText: { color: colors.primary, fontSize: 24 },
  empty: { alignItems: 'center', flex: 1, justifyContent: 'center', minHeight: 230 },
  emptyTitle: { color: colors.textPrimary, fontSize: 14, fontWeight: '800', textAlign: 'center' },
  emptyText: { color: colors.textSecondary, fontSize: 12, marginTop: 5 },
})
