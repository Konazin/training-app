import { useEffect, useState } from 'react'
import { Image, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useRoute, type RouteProp } from '@react-navigation/native'
import type { RootStackParamList } from '../../core/navigation/types'
import type { ExerciseDefinition } from '../../models/training'
import { trainingApi } from '../../services/trainingApi'
import { shared, type ThemeColors, useTheme } from '../../theme'
import { ExerciseVideo } from './ExerciseVideo'
import { attributionLabel, resolveMediaAttribution } from './libraryState'

export function ExerciseDetailScreen() {
  const route = useRoute<RouteProp<RootStackParamList, 'ExerciseDetail'>>()
  const { colors } = useTheme()
  const styles = createStyles(colors)
  const [exercise, setExercise] = useState<ExerciseDefinition | null>(null)
  const [error, setError] = useState('')
  const [retryKey, setRetryKey] = useState(0)

  const load = () => {
    setError('')
    setExercise(null)
    setRetryKey(0)
    void trainingApi.getExerciseDefinition(route.params.exerciseId)
      .then(setExercise).catch((cause) => setError(cause instanceof Error ? cause.message : 'Falha ao carregar exercício.'))
  }
  useEffect(load, [route.params.exerciseId])

  if (error) return <View style={styles.center}><Text style={styles.error}>{error}</Text><Pressable onPress={load}><Text style={styles.link}>Tentar novamente</Text></Pressable></View>
  if (!exercise) return <View style={styles.center}><Text style={styles.muted}>Carregando exercício…</Text></View>

  const displayedMedia = exercise.primaryVideo ?? exercise.primaryImage
  const attribution = resolveMediaAttribution(displayedMedia, exercise)
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.eyebrow}>{exercise.source === 'WGER' ? 'WGER' : 'BIBLIOTECA'}</Text>
      <Text style={styles.title}>{exercise.name}</Text>
      <Text style={styles.meta}>{exercise.primaryMuscleGroup} · {exercise.equipment}</Text>
      {exercise.primaryVideoUrl ? (
        <ExerciseVideo key={retryKey} url={exercise.primaryVideoUrl} posterUrl={exercise.primaryImageUrl} onRetry={() => setRetryKey((value) => value + 1)} />
      ) : exercise.primaryImageUrl ? (
        <Image accessibilityLabel={`Demonstração de ${exercise.name}`} source={{ uri: exercise.primaryImageUrl }} style={styles.image} />
      ) : (
        <View style={styles.empty}><Text style={styles.muted}>Este exercício ainda não possui demonstração.</Text></View>
      )}
      {!!exercise.description && <Text style={styles.body}>{exercise.description}</Text>}
      {!!exercise.instructions && <><Text style={styles.heading}>Como executar</Text><Text style={styles.body}>{exercise.instructions}</Text></>}
      <Text style={styles.attribution}>Fonte: {attributionLabel(attribution)}</Text>
      {!!attribution.sourceUrl && <Pressable onPress={() => void Linking.openURL(attribution.sourceUrl!)}><Text style={styles.link}>Abrir fonte original</Text></Pressable>}
      {!!attribution.licenseUrl && <Pressable onPress={() => void Linking.openURL(attribution.licenseUrl!)}><Text style={styles.link}>Consultar licença</Text></Pressable>}
    </ScrollView>
  )
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  content: { gap: 14, padding: shared.pagePadding, paddingBottom: 60 },
  center: { alignItems: 'center', flex: 1, justifyContent: 'center', padding: 24 },
  eyebrow: { color: colors.gray500, fontSize: 11, fontWeight: '800', letterSpacing: 2 },
  title: { color: colors.ink, fontSize: 32, fontWeight: '800' },
  meta: { color: colors.gray500, fontSize: 13, marginBottom: 4 },
  image: { aspectRatio: 16 / 9, backgroundColor: colors.gray200, borderRadius: 18, width: '100%' },
  empty: { alignItems: 'center', backgroundColor: colors.card, borderRadius: 18, padding: 28 },
  heading: { color: colors.ink, fontSize: 16, fontWeight: '800', marginTop: 8 },
  body: { color: colors.ink, fontSize: 14, lineHeight: 22 },
  muted: { color: colors.gray500, textAlign: 'center' },
  attribution: { color: colors.gray500, fontSize: 11, lineHeight: 17 },
  link: { color: colors.primary, fontSize: 13, fontWeight: '800', paddingVertical: 4 },
  error: { color: colors.danger, marginBottom: 12, textAlign: 'center' },
})
