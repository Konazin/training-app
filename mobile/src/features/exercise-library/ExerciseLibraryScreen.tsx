import { useEffect, useMemo, useState } from 'react'
import {
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  SectionList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import {
  EXERCISE_PACKS,
  type ExerciseDefinition,
  type ExerciseDefinitionInput,
} from '@training/training-domain'
import { FormField } from '../../components/FormField'
import { PrimaryButton } from '../../components/PrimaryButton'
import { Screen } from '../../components/Screen'
import { ScreenHeader } from '../../components/ScreenHeader'
import { SelectableChip } from '../../components/SelectableChip'
import { ThemedTextInput } from '../../components/ThemedTextInput'
import type { RootStackParamList } from '../../navigation/types'
import { shared, type ThemeColors, useTheme } from '../../theme'
import { ExercisePlaceholder } from './ExercisePlaceholder'
import {
  filterExerciseLibrary,
  exerciseMediaLabel,
  exerciseCategoryLabel,
  groupExercisesByMuscle,
  libraryEmptyMessage,
  resolveExerciseMedia,
  type LibraryFilter,
} from './libraryState'

export function ExerciseLibraryScreen({
  exercises,
  loading,
  onCreate,
  onUpdate,
  onArchive,
  onFavorite,
}: {
  exercises: ExerciseDefinition[]
  loading: boolean
  onCreate: (payload: ExerciseDefinitionInput) => Promise<boolean>
  onUpdate: (id: number, payload: ExerciseDefinitionInput) => Promise<boolean>
  onArchive: (id: number) => Promise<boolean>
  onFavorite: (id: number, favorite: boolean) => Promise<boolean>
}) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>()
  const { colors } = useTheme()
  const styles = createStyles(colors)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<LibraryFilter>({ kind: 'ALL' })
  const [viewMode, setViewMode] = useState<'LIST' | 'MUSCLE'>('LIST')
  const [editing, setEditing] = useState<ExerciseDefinition | null | 'new'>(null)
  const filtered = useMemo(() => {
    return filterExerciseLibrary(exercises, query, filter)
  }, [exercises, filter, query])
  const muscles = useMemo(() => groupExercisesByMuscle(exercises), [exercises])
  const equipment = useMemo(() => [...new Set(exercises.map((item) => item.equipment))].sort(), [exercises])
  const categories = useMemo(() => [...new Set(exercises.map((item) => item.category))].sort(), [exercises])
  const sources = useMemo(() => [...new Set(exercises.map((item) => item.source))].sort(), [exercises])
  const emptyMessage = libraryEmptyMessage(exercises.length, query, filter)
  const sections = useMemo(() => groupExercisesByMuscle(filtered)
    .map((group) => ({ title: group.muscle, data: group.exercises })), [filtered])
  const listHeader = <>
    <ScreenHeader
      eyebrow="Catálogo no aparelho"
      title={'Biblioteca de\nexercícios'}
      description="Crie, edite e use exercícios sem conexão."
    />
    <ThemedTextInput
      accessibilityLabel="Buscar exercício"
      value={query}
      onChangeText={setQuery}
      placeholder="Nome, músculo ou equipamento"
      style={styles.search}
    />
    <View accessibilityLabel="Modo de visualização" style={styles.filters}>
      <SelectableChip label="Lista" selected={viewMode === 'LIST'} onPress={() => setViewMode('LIST')} />
      <SelectableChip label="Por músculo" selected={viewMode === 'MUSCLE'} onPress={() => setViewMode('MUSCLE')} />
    </View>
    <View style={styles.filters}>
      <FilterChip label="Todos" filter={{ kind: 'ALL' }} selected={filter} onSelect={setFilter} />
      <FilterChip label="Favoritos" filter={{ kind: 'FAVORITES' }} selected={filter} onSelect={setFilter} />
      <FilterChip label="Recentes" filter={{ kind: 'RECENTS' }} selected={filter} onSelect={setFilter} />
      <FilterChip label="Com mídia" filter={{ kind: 'MEDIA' }} selected={filter} onSelect={setFilter} />
      <FilterChip label="Peso corporal" filter={{ kind: 'BODYWEIGHT' }} selected={filter} onSelect={setFilter} />
    </View>
    <FilterGroup title="PACOTES">
      {EXERCISE_PACKS.map((pack) => (
        <FilterChip key={pack.id} label={pack.name} filter={{ kind: 'PACK', value: pack.id }} selected={filter} onSelect={setFilter} />
      ))}
    </FilterGroup>
    <FilterGroup title="GRUPO MUSCULAR">
      {muscles.map((group) => (
        <FilterChip key={group.muscle} label={`${group.muscle} (${group.exercises.length})`} filter={{ kind: 'MUSCLE', value: group.muscle }} selected={filter} onSelect={setFilter} />
      ))}
    </FilterGroup>
    <FilterGroup title="EQUIPAMENTO">
      {equipment.map((value) => <FilterChip key={value} label={value} filter={{ kind: 'EQUIPMENT', value }} selected={filter} onSelect={setFilter} />)}
    </FilterGroup>
    <FilterGroup title="CATEGORIA">
      {categories.map((value) => <FilterChip key={value} label={exerciseCategoryLabel(value)} filter={{ kind: 'CATEGORY', value }} selected={filter} onSelect={setFilter} />)}
    </FilterGroup>
    <FilterGroup title="FONTE">
      {sources.map((value) => <FilterChip key={value} label={sourceLabel(value)} filter={{ kind: 'SOURCE', value }} selected={filter} onSelect={setFilter} />)}
    </FilterGroup>
  </>
  const empty = loading && !exercises.length
    ? <SkeletonList />
    : <Text accessibilityLiveRegion="polite" style={styles.empty}>{emptyMessage}</Text>
  const renderExercise = ({ item }: { item: ExerciseDefinition }) => <ExerciseCard
    exercise={item}
    onEdit={item.custom ? () => setEditing(item) : undefined}
    onFavorite={() => void onFavorite(item.id, !item.favorite)}
    onOpen={() => navigation.navigate('ExerciseDetail', { exerciseId: item.id })}
  />

  return (
    <Screen style={styles.screen}>
      {viewMode === 'MUSCLE' ? (
        <SectionList
          contentContainerStyle={styles.content}
          sections={sections}
          keyExtractor={(item) => String(item.id)}
          ListHeaderComponent={listHeader}
          ListEmptyComponent={empty}
          renderSectionHeader={({ section }) => (
            <Text accessibilityRole="header" style={styles.muscleHeader}>{section.title}</Text>
          )}
          renderItem={renderExercise}
        />
      ) : (
        <FlatList
          contentContainerStyle={styles.content}
          data={filtered}
          keyExtractor={(item) => String(item.id)}
          ListHeaderComponent={listHeader}
          ListEmptyComponent={empty}
          renderItem={renderExercise}
        />
      )}
      <TouchableOpacity
        accessibilityLabel="Criar exercício personalizado"
        accessibilityRole="button"
        style={styles.fab}
        onPress={() => setEditing('new')}
      >
        <Text style={styles.fabText}>＋</Text>
      </TouchableOpacity>
      <ExerciseForm
        exercise={editing === 'new' ? null : editing}
        visible={editing !== null}
        onClose={() => setEditing(null)}
        onSave={async (input) => {
          const success = editing && editing !== 'new'
            ? await onUpdate(editing.id, input)
            : await onCreate(input)
          if (success) setEditing(null)
        }}
        onArchive={editing && editing !== 'new' && editing.custom
          ? () => Alert.alert('Arquivar exercício?', editing.name, [
            { text: 'Cancelar', style: 'cancel' },
            {
              text: 'Arquivar',
              style: 'destructive',
              onPress: () => void onArchive(editing.id).then((success) => {
                if (success) setEditing(null)
              }),
            },
          ])
          : undefined}
      />
    </Screen>
  )
}

function ExerciseForm({
  exercise,
  visible,
  onClose,
  onSave,
  onArchive,
}: {
  exercise: ExerciseDefinition | null
  visible: boolean
  onClose: () => void
  onSave: (input: ExerciseDefinitionInput) => Promise<void>
  onArchive?: () => void
}) {
  const { colors } = useTheme()
  const styles = createStyles(colors)
  const [name, setName] = useState('')
  const [muscle, setMuscle] = useState('')
  const [equipment, setEquipment] = useState('')
  const [error, setError] = useState('')
  useEffect(() => {
    if (!visible) return
    setName(exercise?.name ?? '')
    setMuscle(exercise?.primaryMuscleGroup ?? '')
    setEquipment(exercise?.equipment ?? '')
    setError('')
  }, [exercise, visible])

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.backdrop}>
        <SafeAreaView accessibilityViewIsModal edges={['bottom']} style={styles.safeSheet}>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.sheet}>
          <Text style={styles.sheetTitle}>{exercise ? 'Editar exercício' : 'Novo exercício'}</Text>
          <FormField label="Nome" value={name} onChangeText={setName} />
          <FormField
            label="Grupo principal"
            value={muscle}
            onChangeText={setMuscle}
          />
          <FormField
            label="Equipamento"
            value={equipment}
            onChangeText={setEquipment}
          />
          {!!error && <Text style={styles.error}>{error}</Text>}
          <PrimaryButton label="Salvar" onPress={() => {
            if (!name.trim() || !muscle.trim() || !equipment.trim()) {
              setError('Preencha nome, grupo e equipamento.')
              return
            }
            void onSave({
              name,
              primaryMuscleGroup: muscle,
              equipment,
              description: exercise?.description ?? '',
              secondaryMuscleGroups: exercise?.secondaryMuscleGroups ?? [],
              category: exercise?.category ?? 'STRENGTH',
              difficulty: exercise?.difficulty ?? 'Iniciante',
              instructions: exercise?.instructions ?? '',
              notes: exercise?.notes ?? '',
              unilateral: exercise?.unilateral ?? false,
              timed: exercise?.timed ?? false,
            })
          }} />
          {!!onArchive && <TouchableOpacity accessibilityRole="button" onPress={onArchive}><Text style={styles.archive}>Arquivar</Text></TouchableOpacity>}
          <TouchableOpacity accessibilityRole="button" onPress={onClose}><Text style={styles.cancel}>Cancelar</Text></TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  )
}

function ExerciseCard({
  exercise,
  onEdit,
  onFavorite,
  onOpen,
}: {
  exercise: ExerciseDefinition
  onEdit?: () => void
  onFavorite: () => void
  onOpen: () => void
}) {
  const { colors } = useTheme()
  const styles = createStyles(colors)
  const media = resolveExerciseMedia(exercise)
  const [imageFailed, setImageFailed] = useState(false)
  return (
    <View style={styles.card}>
      <Pressable
        accessibilityLabel={`${exercise.name}, ${exercise.primaryMuscleGroup}, ${exercise.equipment}, fonte ${sourceLabel(exercise.source)}`}
        accessibilityRole="button"
        onLongPress={onEdit}
        onPress={onOpen}
        style={({ pressed }) => [styles.cardMain, pressed && styles.pressed]}
      >
        {media.kind === 'IMAGE' && !imageFailed
          ? <Image onError={() => setImageFailed(true)} source={{ uri: media.uri }} style={styles.icon} />
          : <ExercisePlaceholder
              compact
              kind={media.kind === 'PLACEHOLDER' || media.kind === 'MISSING'
                ? media.placeholder
                : exercise.category === 'CARDIO' ? 'CARDIO' : 'STRENGTH'}
              missing={imageFailed || media.kind === 'MISSING'}
            />}
        <View style={styles.cardBody}>
          <Text style={styles.name}>{exercise.name}</Text>
          <Text style={styles.meta}>{exercise.primaryMuscleGroup} · {exercise.equipment}</Text>
          <Text style={styles.source}>{sourceLabel(exercise.source)} · {exerciseMediaLabel(exercise)}</Text>
        </View>
        <Text style={styles.arrow}>›</Text>
      </Pressable>
      <Pressable
        accessibilityLabel={exercise.favorite ? `Remover ${exercise.name} dos favoritos` : `Favoritar ${exercise.name}`}
        accessibilityRole="button"
        accessibilityState={{ selected: exercise.favorite }}
        onPress={onFavorite}
        style={styles.favorite}
      >
        <Text style={styles.favoriteText}>{exercise.favorite ? '★' : '☆'}</Text>
      </Pressable>
      {!!onEdit && (
        <TouchableOpacity accessibilityLabel={`Editar ${exercise.name}`} accessibilityRole="button" onPress={onEdit} style={styles.editButton}>
          <Text style={styles.edit}>Editar</Text>
        </TouchableOpacity>
      )}
    </View>
  )
}

function FilterChip({
  label,
  filter,
  selected,
  onSelect,
}: {
  label: string
  filter: LibraryFilter
  selected: LibraryFilter
  onSelect: (filter: LibraryFilter) => void
}) {
  const active = filter.kind === selected.kind
    && (!('value' in filter) || ('value' in selected && filter.value === selected.value))
  return <SelectableChip label={label} selected={active} onPress={() => onSelect(active ? { kind: 'ALL' } : filter)} />
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  const { colors } = useTheme()
  const styles = createStyles(colors)
  return (
    <View style={styles.filterGroup}>
      <Text style={styles.filterTitle}>{title}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
        {children}
      </ScrollView>
    </View>
  )
}

function SkeletonList() {
  const { colors } = useTheme()
  const styles = createStyles(colors)
  return (
    <View accessibilityLabel="Carregando biblioteca" accessibilityRole="progressbar">
      {[0, 1, 2].map((item) => <View key={item} style={styles.skeleton}><View style={styles.skeletonIcon} /><View style={styles.skeletonBody} /></View>)}
    </View>
  )
}

function sourceLabel(source: ExerciseDefinition['source']) {
  return { BUNDLED: 'Integrado', SYSTEM: 'Sistema', CUSTOM: 'Personalizado', WGER: 'Wger' }[source]
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: shared.pagePadding, paddingBottom: 72 },
  search: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 16, borderWidth: 1, color: colors.textPrimary, fontSize: 16, marginBottom: 10, minHeight: 56, paddingHorizontal: 16 },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  card: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 19, borderWidth: 1, flexDirection: 'row', marginBottom: 9, minHeight: 76, overflow: 'hidden' },
  cardMain: { alignItems: 'center', flex: 1, flexDirection: 'row', gap: 12, minHeight: 76, padding: 12 },
  icon: { backgroundColor: colors.gray200, borderRadius: 14, height: 52, width: 52 },
  cardBody: { flex: 1 },
  name: { color: colors.ink, fontSize: 16, fontWeight: '800' },
  meta: { color: colors.textSecondary, fontSize: 14, marginTop: 4 },
  source: { color: colors.textSecondary, fontSize: 12, marginTop: 5 },
  edit: { color: colors.primary, fontSize: 12, fontWeight: '800', padding: 8 },
  editButton: { alignItems: 'center', justifyContent: 'center', minHeight: 48, minWidth: 48 },
  favorite: { alignItems: 'center', justifyContent: 'center', minHeight: 48, minWidth: 48 },
  favoriteText: { color: colors.primary, fontSize: 24 },
  arrow: { color: colors.gray400, fontSize: 25 },
  empty: { color: colors.gray500, padding: 30, textAlign: 'center' },
  fab: { alignItems: 'center', backgroundColor: colors.primary, borderRadius: 19, bottom: 24, height: 56, justifyContent: 'center', position: 'absolute', right: 20, width: 56 },
  fabText: { color: colors.onPrimary, fontSize: 22 },
  backdrop: { backgroundColor: colors.overlay, flex: 1, justifyContent: 'flex-end' },
  safeSheet: { backgroundColor: colors.card, borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '92%' },
  sheet: { padding: 20, paddingBottom: 30 },
  sheetTitle: { color: colors.ink, fontSize: 22, fontWeight: '700', marginBottom: 20 },
  cancel: { color: colors.gray500, fontSize: 12, fontWeight: '700', padding: 15, textAlign: 'center' },
  archive: { color: colors.danger, fontSize: 12, fontWeight: '700', paddingTop: 18, textAlign: 'center' },
  error: { color: colors.danger, fontSize: 12, marginBottom: 10 },
  pressed: { opacity: 0.72 },
  filterGroup: { marginBottom: 12 },
  filterTitle: { color: colors.textSecondary, fontSize: 12, fontWeight: '900', marginBottom: 6 },
  muscleHeader: { backgroundColor: colors.background, color: colors.textPrimary, fontSize: 18, fontWeight: '900', paddingBottom: 8, paddingTop: 14 },
  filterScroll: { gap: 8, paddingRight: 12 },
  skeleton: { alignItems: 'center', backgroundColor: colors.surface, borderRadius: 19, flexDirection: 'row', gap: 12, marginBottom: 9, minHeight: 76, padding: 12 },
  skeletonIcon: { backgroundColor: colors.surfaceSecondary, borderRadius: 14, height: 52, width: 52 },
  skeletonBody: { backgroundColor: colors.surfaceSecondary, borderRadius: 8, height: 20, width: '60%' },
})
