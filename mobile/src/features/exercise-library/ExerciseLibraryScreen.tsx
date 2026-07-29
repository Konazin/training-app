import { useEffect, useMemo, useState } from 'react'
import {
  Alert,
  FlatList,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import type { ExerciseDefinition, ExerciseDefinitionInput } from '@training/training-domain'
import { FormField } from '../../components/FormField'
import { PrimaryButton } from '../../components/PrimaryButton'
import { ScreenHeader } from '../../components/ScreenHeader'
import type { RootStackParamList } from '../../navigation/types'
import { shared, type ThemeColors, useTheme } from '../../theme'

export function ExerciseLibraryScreen({
  exercises,
  loading,
  onCreate,
  onUpdate,
  onArchive,
}: {
  exercises: ExerciseDefinition[]
  loading: boolean
  onCreate: (payload: ExerciseDefinitionInput) => Promise<boolean>
  onUpdate: (id: number, payload: ExerciseDefinitionInput) => Promise<boolean>
  onArchive: (id: number) => Promise<boolean>
}) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>()
  const { colors } = useTheme()
  const styles = createStyles(colors)
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('')
  const [editing, setEditing] = useState<ExerciseDefinition | null | 'new'>(null)
  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('pt-BR')
    return exercises.filter((exercise) => (
      (!category || exercise.category === category)
      && (!normalized || [exercise.name, exercise.primaryMuscleGroup, exercise.equipment]
        .some((value) => value.toLocaleLowerCase('pt-BR').includes(normalized)))
    ))
  }, [category, exercises, query])

  return (
    <View style={styles.screen}>
      <FlatList
        contentContainerStyle={styles.content}
        data={filtered}
        keyExtractor={(item) => String(item.id)}
        ListHeaderComponent={<>
          <ScreenHeader
            eyebrow="Catálogo no aparelho"
            title={'Biblioteca de\nexercícios'}
            description="Crie, edite e use exercícios sem conexão."
          />
          <TextInput
            accessibilityLabel="Buscar exercício"
            value={query}
            onChangeText={setQuery}
            placeholder="Nome, músculo ou equipamento"
            placeholderTextColor={colors.gray400}
            style={styles.search}
          />
          <View style={styles.filters}>
            {['', 'STRENGTH', 'CARDIO', 'MOBILITY', 'ENDURANCE'].map((value) => (
              <Pressable
                key={value || 'all'}
                onPress={() => setCategory(value)}
                style={[styles.chip, category === value && styles.chipActive]}
              >
                <Text style={[styles.chipText, category === value && styles.chipTextActive]}>
                  {value || 'Todos'}
                </Text>
              </Pressable>
            ))}
          </View>
        </>}
        ListEmptyComponent={!loading ? <Text style={styles.empty}>Nenhum exercício encontrado.</Text> : null}
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            onPress={() => navigation.navigate('ExerciseDetail', { exerciseId: item.id })}
            onLongPress={() => setEditing(item)}
            style={styles.card}
          >
            {item.primaryImageUrl
              ? <Image source={{ uri: item.primaryImageUrl }} style={styles.icon} />
              : <View style={styles.iconFallback}><Text style={styles.iconText}>⌁</Text></View>}
            <View style={styles.cardBody}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.meta}>{item.primaryMuscleGroup} · {item.equipment}</Text>
              <Text style={styles.source}>{item.source}</Text>
            </View>
            {item.custom && (
              <TouchableOpacity accessibilityLabel={`Editar ${item.name}`} onPress={() => setEditing(item)}>
                <Text style={styles.edit}>Editar</Text>
              </TouchableOpacity>
            )}
            <Text style={styles.arrow}>›</Text>
          </Pressable>
        )}
      />
      <TouchableOpacity
        accessibilityLabel="Criar exercício personalizado"
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
    </View>
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
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
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
          {!!onArchive && <TouchableOpacity onPress={onArchive}><Text style={styles.archive}>Arquivar</Text></TouchableOpacity>}
          <TouchableOpacity onPress={onClose}><Text style={styles.cancel}>Cancelar</Text></TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: shared.pagePadding, paddingBottom: 125 },
  search: { backgroundColor: colors.card, borderColor: colors.gray200, borderRadius: 16, borderWidth: 1, color: colors.ink, marginBottom: 10, minHeight: 52, paddingHorizontal: 14 },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 14 },
  chip: { borderColor: colors.gray200, borderRadius: 99, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8 },
  chipActive: { backgroundColor: colors.nearBlack, borderColor: colors.nearBlack },
  chipText: { color: colors.gray500, fontSize: 9, fontWeight: '700' },
  chipTextActive: { color: '#fff' },
  card: { alignItems: 'center', backgroundColor: colors.card, borderColor: colors.gray200, borderRadius: 19, borderWidth: 1, flexDirection: 'row', gap: 11, marginBottom: 9, padding: 11 },
  icon: { backgroundColor: colors.gray200, borderRadius: 14, height: 52, width: 52 },
  iconFallback: { alignItems: 'center', backgroundColor: colors.nearBlack, borderRadius: 14, height: 52, justifyContent: 'center', width: 52 },
  iconText: { color: '#fff', fontSize: 18 },
  cardBody: { flex: 1 },
  name: { color: colors.ink, fontSize: 13, fontWeight: '800' },
  meta: { color: colors.gray500, fontSize: 10, marginTop: 4 },
  source: { color: colors.gray400, fontSize: 8, marginTop: 5 },
  edit: { color: colors.primary, fontSize: 9, fontWeight: '800', padding: 8 },
  arrow: { color: colors.gray400, fontSize: 25 },
  empty: { color: colors.gray500, padding: 30, textAlign: 'center' },
  fab: { alignItems: 'center', backgroundColor: colors.primary, borderRadius: 19, bottom: 24, height: 56, justifyContent: 'center', position: 'absolute', right: 20, width: 56 },
  fabText: { color: colors.onPrimary, fontSize: 22 },
  backdrop: { backgroundColor: 'rgba(0,0,0,.6)', flex: 1, justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.card, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, paddingBottom: 30 },
  sheetTitle: { color: colors.ink, fontSize: 22, fontWeight: '700', marginBottom: 20 },
  cancel: { color: colors.gray500, fontSize: 11, fontWeight: '700', padding: 15, textAlign: 'center' },
  archive: { color: colors.danger, fontSize: 11, fontWeight: '700', paddingTop: 18, textAlign: 'center' },
  error: { color: colors.danger, fontSize: 10, marginBottom: 10 },
})
