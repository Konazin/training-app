import { useMemo, useRef } from 'react'
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native'
import { ChevronRight, Globe, Star } from 'lucide-react-native'
import type { ExerciseDefinition } from '@training/training-domain'
import { PrimaryButton } from '../../../components/PrimaryButton'
import { EmptyState } from '../../../components/ui'
import { PressableScale, Reveal } from '../../../motion'
import { shared, type ThemeColors, useTheme } from '../../../theme'
import { typography } from '../../../theme/typography'
import { ExerciseFilters, useExerciseFilters } from '../../exercise-library/ExerciseFilters'
import { canonicalMuscle, EXERCISE_SOURCE_LABELS, equipmentLabel } from '../../exercise-library/exerciseTaxonomy'
import { exerciseMediaLabel, libraryEmptyMessage, type LibraryFilter } from '../../exercise-library/libraryState'

export function ExercisePicker({
  exercises,
  excludedId,
  onFavorite,
  onSelect,
  onSearchOnline,
}: {
  exercises: ExerciseDefinition[]
  excludedId?: number
  onFavorite?: (id: number, favorite: boolean) => Promise<boolean>
  onSelect: (exercise: ExerciseDefinition) => void
  /** Abre o catálogo online quando a biblioteca local não resolve a busca. */
  onSearchOnline?: () => void
}) {
  const { colors } = useTheme()
  const styles = createStyles(colors)
  const lastSelection = useRef({ id: 0, at: 0 })
  const available = useMemo(
    () => exercises.filter((exercise) => !exercise.archived && exercise.id !== excludedId),
    [excludedId, exercises],
  )
  const filters = useExerciseFilters(available)
  const { filtered, query, active } = filters
  const select = (exercise: ExerciseDefinition) => {
    const now = Date.now()
    if (lastSelection.current.id === exercise.id && now - lastSelection.current.at < 800) return
    lastSelection.current = { id: exercise.id, at: now }
    onSelect(exercise)
  }
  const emptyFilter: LibraryFilter = active ? { kind: 'MUSCLE', value: '' } : { kind: 'ALL' }

  return (
    <View style={styles.container}>
      <View style={styles.top}>
        <ExerciseFilters exercises={available} filters={filters} />
      </View>
      <FlatList
        data={filtered}
        keyExtractor={(item) => String(item.id)}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.content, !filtered.length && styles.emptyContent]}
        ListEmptyComponent={(
          <EmptyState
            action={onSearchOnline ? <PrimaryButton icon={<Globe color={colors.tx} size={18} strokeWidth={1.8} />} label="Buscar no catálogo online" onPress={onSearchOnline} secondary /> : undefined}
            description={onSearchOnline ? 'Altere a busca ou os filtros, ou procure no ExerciseDB e no Wger.' : 'Altere a busca ou os filtros.'}
            title={libraryEmptyMessage(available.length, query, emptyFilter)}
          />
        )}
        renderItem={({ item, index }) => (
          <Reveal index={Math.min(index, 8)}>
            <View style={styles.item}>
              <PressableScale
                accessibilityLabel={`Adicionar ${item.name}`}
                accessibilityRole="button"
                onPress={() => select(item)}
                pressedScale={0.99}
                style={styles.itemMain}
              >
                <View style={styles.itemCopy}>
                  <Text style={styles.name}>{item.name}</Text>
                  <Text style={styles.meta}>
                    {canonicalMuscle(item.primaryMuscleGroup)} · {equipmentLabel(item.equipment)} · {EXERCISE_SOURCE_LABELS[item.source] ?? item.source}
                  </Text>
                  <Text style={styles.media}>{exerciseMediaLabel(item)}</Text>
                </View>
                <ChevronRight color={colors.mu} size={18} strokeWidth={1.5} />
              </PressableScale>
              {!!onFavorite && (
                <Pressable
                  accessibilityLabel={item.favorite ? `Remover ${item.name} dos favoritos` : `Favoritar ${item.name}`}
                  accessibilityRole="button"
                  accessibilityState={{ selected: item.favorite }}
                  onPress={() => void onFavorite(item.id, !item.favorite)}
                  style={styles.favorite}
                >
                  <Star color={item.favorite ? colors.tx : colors.mu} fill={item.favorite ? colors.tx : 'transparent'} size={20} strokeWidth={1.5} />
                </Pressable>
              )}
            </View>
          </Reveal>
        )}
      />
    </View>
  )
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: { flex: 1 },
  top: { paddingHorizontal: shared.pagePadding },
  content: { paddingBottom: 48, paddingHorizontal: shared.pagePadding },
  emptyContent: { flexGrow: 1 },
  item: { alignItems: 'center', borderBottomColor: colors.bd, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', minHeight: 72 },
  itemMain: { alignItems: 'center', flex: 1, flexDirection: 'row', minHeight: 72, paddingVertical: shared.spacing.md },
  itemCopy: { flex: 1 },
  name: { ...typography.body, color: colors.tx, fontWeight: '500' },
  meta: { ...typography.caption, color: colors.t2, marginTop: 2 },
  media: { ...typography.captionSmall, color: colors.mu, marginTop: 2 },
  favorite: { alignItems: 'center', justifyContent: 'center', minHeight: 48, minWidth: 48 },
})
