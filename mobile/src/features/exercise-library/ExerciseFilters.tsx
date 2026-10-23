import { type ReactNode, useMemo, useState } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { Search, SlidersHorizontal } from 'lucide-react-native'
import { EXERCISE_PACKS, type ExerciseDefinition } from '@training/training-domain'
import { PrimaryButton } from '../../components/PrimaryButton'
import { SelectableChip } from '../../components/SelectableChip'
import { ThemedTextInput } from '../../components/ThemedTextInput'
import { BottomSheet } from '../../components/ui'
import { PressableScale } from '../../motion'
import { shared, type ThemeColors, useTheme } from '../../theme'
import { typography } from '../../theme/typography'
import { canonicalMuscle, equipmentTokens, EXERCISE_SOURCE_LABELS } from './exerciseTaxonomy'
import { applyPickerFilters, NO_FACETS, type Facets, type QuickFilter } from '../training-plan/views/pickerFilters'

const QUICK: readonly (readonly [QuickFilter, string])[] = [
  ['ALL', 'Todos'], ['FAVORITES', 'Favoritos'], ['RECENTS', 'Recentes'], ['MEDIA', 'Com mídia'], ['BODYWEIGHT', 'Peso corporal'],
]

/** Estado de busca + atalhos + facetas, compartilhado entre a Biblioteca e o seletor de exercícios. */
export function useExerciseFilters(exercises: readonly ExerciseDefinition[]) {
  const [query, setQuery] = useState('')
  const [quick, setQuick] = useState<QuickFilter>('ALL')
  const [facets, setFacets] = useState<Facets>(NO_FACETS)
  const filtered = useMemo(() => applyPickerFilters(exercises, query, quick, facets), [exercises, facets, query, quick])
  return { query, setQuery, quick, setQuick, facets, setFacets, filtered, active: quick !== 'ALL' || Object.values(facets).some(Boolean) }
}

export function ExerciseFilters({
  exercises,
  filters,
  trailing,
}: {
  /** Universo sobre o qual as opções de filtro são calculadas (já sem arquivados). */
  exercises: readonly ExerciseDefinition[]
  filters: ReturnType<typeof useExerciseFilters>
  trailing?: ReactNode
}) {
  const { colors } = useTheme()
  const styles = createStyles(colors)
  const [sheet, setSheet] = useState(false)
  const { query, setQuery, quick, setQuick, facets, setFacets, filtered } = filters
  const muscles = useMemo(
    () => [...new Set(exercises.map((exercise) => canonicalMuscle(exercise.primaryMuscleGroup)))].sort((a, b) => a.localeCompare(b, 'pt-BR')),
    [exercises],
  )
  const equipment = useMemo(
    () => [...new Set(exercises.flatMap((exercise) => equipmentTokens(exercise.equipment)))].sort((a, b) => a.localeCompare(b, 'pt-BR')),
    [exercises],
  )
  const sources = useMemo(
    () => [...new Set(exercises.map((exercise) => exercise.source))].filter((source) => EXERCISE_SOURCE_LABELS[source]),
    [exercises],
  )
  const activeFacets = Object.values(facets).filter(Boolean).length
  const setFacet = (key: keyof Facets, value: string) =>
    setFacets((current) => ({ ...current, [key]: current[key] === value ? null : value }))

  return (
    <View>
      <View style={styles.searchWrap}>
        <Search color={colors.mu} size={18} strokeWidth={1.8} style={styles.searchIcon} />
        <ThemedTextInput
          accessibilityLabel="Buscar exercício"
          placeholder="Nome, alias, músculo ou equipamento"
          style={styles.search}
          value={query}
          onChangeText={setQuery}
        />
      </View>
      <View style={styles.quickRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} style={styles.quickScroll}>
          {QUICK.map(([value, label]) => (
            <SelectableChip key={value} label={label} selected={quick === value} onPress={() => setQuick(quick === value ? 'ALL' : value)} />
          ))}
        </ScrollView>
        <PressableScale
          accessibilityLabel={activeFacets ? `Filtros, ${activeFacets} ativos` : 'Filtros'}
          accessibilityRole="button"
          onPress={() => setSheet(true)}
          style={[styles.filterButton, activeFacets > 0 && styles.filterButtonActive]}
        >
          <SlidersHorizontal color={activeFacets ? colors.on : colors.tx} size={18} strokeWidth={1.8} />
          {activeFacets > 0 && <Text style={styles.filterCount}>{activeFacets}</Text>}
        </PressableScale>
      </View>
      {activeFacets > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} style={styles.activeScroll}>
          {(Object.entries(facets) as [keyof Facets, string | null][]).filter(([, value]) => value).map(([key, value]) => (
            <SelectableChip
              key={key}
              label={`${key === 'source' ? EXERCISE_SOURCE_LABELS[value!] ?? value : key === 'pack' ? EXERCISE_PACKS.find((pack) => pack.id === value)?.name ?? value : value} ×`}
              selected
              onPress={() => setFacets((current) => ({ ...current, [key]: null }))}
            />
          ))}
        </ScrollView>
      )}
      <View style={styles.countRow}>
        <Text accessibilityLiveRegion="polite" style={styles.count}>{filtered.length} exercício{filtered.length === 1 ? '' : 's'}</Text>
        {trailing}
      </View>

      <BottomSheet title="Filtros" visible={sheet} onClose={() => setSheet(false)}>
        <ScrollView showsVerticalScrollIndicator={false} style={styles.sheetScroll}>
          <FacetGroup label="Fonte">
            {sources.map((source) => (
              <SelectableChip key={source} label={EXERCISE_SOURCE_LABELS[source]!} selected={facets.source === source} onPress={() => setFacet('source', source)} />
            ))}
          </FacetGroup>
          <FacetGroup label="Grupo muscular">
            {muscles.map((muscle) => <SelectableChip key={muscle} label={muscle} selected={facets.muscle === muscle} onPress={() => setFacet('muscle', muscle)} />)}
          </FacetGroup>
          <FacetGroup label="Equipamento">
            {equipment.map((item) => <SelectableChip key={item} label={item} selected={facets.equipment === item} onPress={() => setFacet('equipment', item)} />)}
          </FacetGroup>
          <FacetGroup label="Pacotes">
            {EXERCISE_PACKS.map((pack) => <SelectableChip key={pack.id} label={pack.name} selected={facets.pack === pack.id} onPress={() => setFacet('pack', pack.id)} />)}
          </FacetGroup>
        </ScrollView>
        <View style={styles.sheetActions}>
          <PrimaryButton label={`Ver ${filtered.length} exercício${filtered.length === 1 ? '' : 's'}`} onPress={() => setSheet(false)} />
          {activeFacets > 0 && <PrimaryButton label="Limpar filtros" onPress={() => setFacets(NO_FACETS)} secondary />}
        </View>
      </BottomSheet>
    </View>
  )
}

function FacetGroup({ label, children }: { label: string; children: ReactNode }) {
  const { colors } = useTheme()
  const styles = createStyles(colors)
  return (
    <View style={styles.facet}>
      <Text accessibilityRole="header" style={styles.facetLabel}>{label}</Text>
      <View style={styles.facetChips}>{children}</View>
    </View>
  )
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  searchWrap: { justifyContent: 'center', marginBottom: shared.spacing.md },
  searchIcon: { left: 14, position: 'absolute', zIndex: 1 },
  search: { backgroundColor: colors.s1, borderColor: colors.mu, borderRadius: shared.radii.md, borderWidth: 1, color: colors.tx, fontFamily: typography.body.fontFamily, fontSize: 15, minHeight: 52, paddingLeft: 42, paddingRight: 12 },
  quickRow: { alignItems: 'center', flexDirection: 'row', gap: shared.spacing.sm },
  quickScroll: { flex: 1 },
  chips: { gap: shared.spacing.sm, paddingRight: shared.spacing.sm },
  activeScroll: { flexGrow: 0, marginTop: shared.spacing.sm },
  filterButton: { alignItems: 'center', borderColor: colors.mu, borderRadius: 24, borderWidth: 1, flexDirection: 'row', gap: 6, height: 48, justifyContent: 'center', minWidth: 48, paddingHorizontal: 12 },
  filterButtonActive: { backgroundColor: colors.ac, borderColor: colors.ac },
  filterCount: { ...typography.captionSmall, color: colors.on, fontWeight: '600' },
  countRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: shared.spacing.xs, marginTop: shared.spacing.md },
  count: { ...typography.captionSmall, color: colors.t2 },
  sheetScroll: { maxHeight: 420 },
  facet: { marginBottom: shared.spacing.xl },
  facetLabel: { ...typography.caption, color: colors.t2, marginBottom: shared.spacing.sm },
  facetChips: { flexDirection: 'row', flexWrap: 'wrap', gap: shared.spacing.sm },
  sheetActions: { gap: shared.spacing.sm, marginTop: shared.spacing.md },
})
