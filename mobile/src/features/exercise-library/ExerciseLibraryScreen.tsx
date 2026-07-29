import { useCallback, useEffect, useRef, useState } from 'react'
import { FlatList, Image, Modal, Pressable, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { FormField } from '../../components/FormField'
import { PrimaryButton } from '../../components/PrimaryButton'
import { ScreenHeader } from '../../components/ScreenHeader'
import type { RootStackParamList } from '../../core/navigation/types'
import type { ExerciseDefinition, ExerciseDefinitionInput } from '../../models/training'
import { trainingApi } from '../../services/trainingApi'
import { shared, type ThemeColors, useTheme } from '../../theme'
import { mergeExercisePages } from './libraryState'

export function ExerciseLibraryScreen({ onCreate }: {
  exercises?: ExerciseDefinition[]
  onCreate: (payload: ExerciseDefinitionInput) => Promise<boolean>
}) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>()
  const { colors } = useTheme()
  const styles = createStyles(colors)
  const [items, setItems] = useState<ExerciseDefinition[]>([])
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [source, setSource] = useState('')
  const [hasVideo, setHasVideo] = useState(false)
  const [page, setPage] = useState(0)
  const [last, setLast] = useState(true)
  const [loading, setLoading] = useState(false)
  const loadingRef = useRef(false)
  const requestRef = useRef(0)
  const [error, setError] = useState('')
  const [show, setShow] = useState(false)
  const [name, setName] = useState('')
  const [muscle, setMuscle] = useState('')
  const [equipment, setEquipment] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query.trim()), 350)
    return () => clearTimeout(timer)
  }, [query])

  const load = useCallback(async (nextPage = 0) => {
    if (nextPage > 0 && loadingRef.current) return
    const requestId = ++requestRef.current
    loadingRef.current = true
    setLoading(true)
    setError('')
    try {
      const result = await trainingApi.getExerciseLibrary({
        page: nextPage, size: 20, query: debouncedQuery, source, hasVideo: hasVideo || undefined,
      })
      if (requestId !== requestRef.current) return
      setItems((current) => mergeExercisePages(current, result.content, nextPage === 0))
      setPage(result.page)
      setLast(result.last)
    } catch (cause) {
      if (requestId === requestRef.current) {
        setError(cause instanceof Error ? cause.message : 'Falha ao carregar biblioteca.')
      }
    } finally {
      if (requestId === requestRef.current) {
        setLoading(false)
        loadingRef.current = false
      }
    }
  }, [debouncedQuery, hasVideo, source])

  useEffect(() => { void load(0) }, [debouncedQuery, source, hasVideo])

  async function submit() {
    if (!name.trim() || !muscle.trim() || !equipment.trim()) return
    if (await onCreate({
      name, description: '', primaryMuscleGroup: muscle, secondaryMuscleGroups: [], equipment,
      category: 'STRENGTH', difficulty: 'Iniciante', instructions: '', notes: '', mediaUrl: '',
      unilateral: false, timed: false,
    })) {
      setShow(false); setName(''); setMuscle(''); setEquipment(''); void load(0)
    }
  }

  return (
    <View style={styles.screen}>
      <FlatList
        contentContainerStyle={styles.content}
        data={items}
        keyExtractor={(item) => String(item.id)}
        onEndReached={() => { if (!last && !loading) void load(page + 1) }}
        onEndReachedThreshold={0.4}
        onRefresh={() => void load(0)}
        refreshing={loading && page === 0}
        ListHeaderComponent={<>
          <ScreenHeader eyebrow="Catálogo reutilizável" title={'Biblioteca de\nexercícios'} description="Busque movimentos e veja a execução antes de treinar." />
          <TextInput accessibilityLabel="Buscar exercício" value={query} onChangeText={setQuery} placeholder="Buscar exercício..." placeholderTextColor={colors.gray400} style={styles.search} />
          <View style={styles.filters}>
            {['', 'WGER', 'CUSTOM'].map((value) => <Pressable key={value || 'all'} onPress={() => setSource(value)} style={[styles.chip, source === value && styles.chipActive]}><Text style={[styles.chipText, source === value && styles.chipTextActive]}>{value || 'Todos'}</Text></Pressable>)}
            <Pressable onPress={() => setHasVideo((value) => !value)} style={[styles.chip, hasVideo && styles.chipActive]}><Text style={[styles.chipText, hasVideo && styles.chipTextActive]}>Com vídeo</Text></Pressable>
          </View>
          {!!error && <Pressable onPress={() => void load(0)}><Text style={styles.error}>{error} Toque para tentar novamente.</Text></Pressable>}
        </>}
        ListEmptyComponent={!loading ? <Text style={styles.empty}>Nenhum exercício encontrado.</Text> : null}
        renderItem={({ item }) => (
          <Pressable accessibilityRole="button" onPress={() => navigation.navigate('ExerciseDetail', { exerciseId: item.id })} style={styles.card}>
            {item.primaryImageUrl ? <Image source={{ uri: item.primaryImageUrl }} style={styles.icon} /> : <View style={styles.iconFallback}><Text style={styles.iconText}>⌁</Text></View>}
            <View style={styles.cardBody}><Text style={styles.name}>{item.name}</Text><Text style={styles.meta}>{item.primaryMuscleGroup} · {item.equipment}</Text><Text style={styles.source}>{item.source}{item.hasVideo ? ' · ▶ vídeo' : ''}</Text></View>
            <Text style={styles.arrow}>›</Text>
          </Pressable>
        )}
      />
      <TouchableOpacity accessibilityLabel="Criar exercício personalizado" style={styles.fab} onPress={() => setShow(true)}><Text style={styles.fabText}>＋</Text></TouchableOpacity>
      <Modal visible={show} transparent animationType="slide"><View style={styles.backdrop}><View style={styles.sheet}><Text style={styles.sheetTitle}>Novo exercício</Text><FormField label="Nome" value={name} onChangeText={setName} /><FormField label="Grupo principal" value={muscle} onChangeText={setMuscle} /><FormField label="Equipamento" value={equipment} onChangeText={setEquipment} /><PrimaryButton label="Salvar na biblioteca" onPress={() => void submit()} /><TouchableOpacity onPress={() => setShow(false)}><Text style={styles.cancel}>Cancelar</Text></TouchableOpacity></View></View></Modal>
    </View>
  )
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  screen: { flex: 1 }, content: { padding: shared.pagePadding, paddingBottom: 125 },
  search: { backgroundColor: colors.card, borderColor: colors.gray200, borderRadius: 16, borderWidth: 1, color: colors.ink, marginBottom: 10, minHeight: 52, paddingHorizontal: 14 },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 14 },
  chip: { borderColor: colors.gray200, borderRadius: 99, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8 },
  chipActive: { backgroundColor: colors.nearBlack, borderColor: colors.nearBlack },
  chipText: { color: colors.gray500, fontSize: 10, fontWeight: '700' }, chipTextActive: { color: '#fff' },
  card: { alignItems: 'center', backgroundColor: colors.card, borderColor: colors.gray200, borderRadius: 19, borderWidth: 1, flexDirection: 'row', gap: 11, marginBottom: 9, padding: 11 },
  icon: { backgroundColor: colors.gray200, borderRadius: 14, height: 52, width: 52 },
  iconFallback: { alignItems: 'center', backgroundColor: colors.nearBlack, borderRadius: 14, height: 52, justifyContent: 'center', width: 52 },
  iconText: { color: '#fff', fontSize: 18 }, cardBody: { flex: 1 }, name: { color: colors.ink, fontSize: 13, fontWeight: '800' },
  meta: { color: colors.gray500, fontSize: 10, marginTop: 4 }, source: { color: colors.gray400, fontSize: 9, marginTop: 5, textTransform: 'uppercase' },
  arrow: { color: colors.gray400, fontSize: 25 }, error: { color: colors.danger, fontSize: 11, marginBottom: 12 },
  empty: { color: colors.gray500, padding: 30, textAlign: 'center' },
  fab: { alignItems: 'center', backgroundColor: colors.primary, borderRadius: 19, bottom: 24, height: 56, justifyContent: 'center', position: 'absolute', right: 20, width: 56 },
  fabText: { color: colors.onPrimary, fontSize: 22 }, backdrop: { backgroundColor: 'rgba(0,0,0,.6)', flex: 1, justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.card, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, paddingBottom: 30 },
  sheetTitle: { color: colors.ink, fontSize: 22, fontWeight: '700', marginBottom: 20 },
  cancel: { color: colors.gray500, fontSize: 11, fontWeight: '700', padding: 15, textAlign: 'center' },
})
