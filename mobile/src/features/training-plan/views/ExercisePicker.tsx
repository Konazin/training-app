import { useMemo, useRef, useState } from 'react'
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { ChevronRight, Globe, Search, SlidersHorizontal, Star } from 'lucide-react-native'
import { EXERCISE_PACKS, type ExerciseDefinition } from '@training/training-domain'
import { PrimaryButton } from '../../../components/PrimaryButton'
import { SelectableChip } from '../../../components/SelectableChip'
import { ThemedTextInput } from '../../../components/ThemedTextInput'
import { BottomSheet, EmptyState } from '../../../components/ui'
import { PressableScale, Reveal } from '../../../motion'
import { shared, type ThemeColors, useTheme } from '../../../theme'
import { typography } from '../../../theme/typography'
import {
  canonicalMuscle,
  EXERCISE_SOURCE_LABELS,
  equipmentLabel,
  equipmentTokens,
} from '../../exercise-library/exerciseTaxonomy'
import { applyPickerFilters, NO_FACETS, type Facets, type QuickFilter } from './pickerFilters'
import {
  exerciseMediaLabel,
  libraryEmptyMessage,
  type LibraryFilter,
} from '../../exercise-library/libraryState'

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
  const [query, setQuery] = useState('')
  const [quick, setQuick] = useState<QuickFilter>('ALL')
  const [facets, setFacets] = useState<Facets>(NO_FACETS)
  const [sheet, setSheet] = useState(false)
  const lastSelection = useRef({ id: 0, at: 0 })
  const available = useMemo(
    () => exercises.filter((exercise) => !exercise.archived && exercise.id !== excludedId),
    [excludedId, exercises],
  )
  const muscles = useMemo(
    () => [...new Set(available.map((exercise) => canonicalMuscle(exercise.primaryMuscleGroup)))].sort((a, b) => a.localeCompare(b, 'pt-BR')),
    [available],
  )
  const equipment = useMemo(
    () => [...new Set(available.flatMap((exercise) => equipmentTokens(exercise.equipment)))].sort((a, b) => a.localeCompare(b, 'pt-BR')),
    [available],
  )
  const sources = useMemo(
    () => [...new Set(available.map((exercise) => exercise.source))].filter((source) => EXERCISE_SOURCE_LABELS[source]),
    [available],
  )
  const filtered = useMemo(
    () => applyPickerFilters(available, query, quick, facets),
    [available, facets, query, quick],
  )
  const activeFacets = Object.values(facets).filter(Boolean).length
  const select = (exercise: ExerciseDefinition) => {
    const now = Date.now()
    if (lastSelection.current.id === exercise.id && now - lastSelection.current.at < 800) return
    lastSelection.current = { id: exercise.id, at: now }
    onSelect(exercise)
  }
  const setFacet = (key: keyof Facets, value: string) =>
    setFacets((current) => ({ ...current, [key]: current[key] === value ? null : value }))
  const emptyFilter: LibraryFilter = quick === 'ALL' && !activeFacets ? { kind: 'ALL' } : { kind: 'MUSCLE', value: '' }

  return (
    <View style={styles.container}>
      <View style={styles.top}>
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
            {([['ALL', 'Todos'], ['FAVORITES', 'Favoritos'], ['RECENTS', 'Recentes'], ['BODYWEIGHT', 'Peso corporal']] as const).map(([value, label]) => (
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
        <Text accessibilityLiveRegion="polite" style={styles.count}>{filtered.length} exercício{filtered.length === 1 ? '' : 's'}</Text>
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

function FacetGroup({ label, children }: { label: string; children: React.ReactNode }) {
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
  container: { flex: 1 },
  top: { paddingHorizontal: shared.pagePadding },
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
  count: { ...typography.captionSmall, color: colors.t2, marginBottom: shared.spacing.xs, marginTop: shared.spacing.md },
  content: { paddingBottom: 48, paddingHorizontal: shared.pagePadding },
  emptyContent: { flexGrow: 1 },
  item: { alignItems: 'center', borderBottomColor: colors.bd, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', minHeight: 72 },
  itemMain: { alignItems: 'center', flex: 1, flexDirection: 'row', minHeight: 72, paddingVertical: shared.spacing.md },
  itemCopy: { flex: 1 },
  name: { ...typography.body, color: colors.tx, fontWeight: '500' },
  meta: { ...typography.caption, color: colors.t2, marginTop: 2 },
  media: { ...typography.captionSmall, color: colors.mu, marginTop: 2 },
  favorite: { alignItems: 'center', justifyContent: 'center', minHeight: 48, minWidth: 48 },
  sheetScroll: { maxHeight: 420 },
  facet: { marginBottom: shared.spacing.xl },
  facetLabel: { ...typography.caption, color: colors.t2, marginBottom: shared.spacing.sm },
  facetChips: { flexDirection: 'row', flexWrap: 'wrap', gap: shared.spacing.sm },
  sheetActions: { gap: shared.spacing.sm, marginTop: shared.spacing.md },
})
