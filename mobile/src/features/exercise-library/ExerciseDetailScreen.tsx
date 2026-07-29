import { useState } from 'react'
import { Image, Linking, Pressable, StyleSheet, Text, View } from 'react-native'
import { useRoute, type RouteProp } from '@react-navigation/native'
import type { ExerciseDefinition } from '@training/training-domain'
import type { RootStackParamList } from '../../navigation/types'
import { Screen, ScreenScrollView } from '../../components/Screen'
import { type ThemeColors, useTheme } from '../../theme'
import { ExerciseVideo } from './ExerciseVideo'
import { attributionLabel, resolveMediaAttribution } from './libraryState'

export function ExerciseDetailScreen({ exercises }: { exercises: ExerciseDefinition[] }) {
  const route = useRoute<RouteProp<RootStackParamList, 'ExerciseDetail'>>()
  const { colors } = useTheme()
  const styles = createStyles(colors)
  const [showVideo, setShowVideo] = useState(false)
  const [retryKey, setRetryKey] = useState(0)
  const exercise = exercises.find((item) => item.id === route.params.exerciseId)

  if (!exercise) {
    return <Screen><View style={styles.center}><Text style={styles.muted}>Exercício não encontrado.</Text></View></Screen>
  }
  const displayedMedia = exercise.primaryVideo ?? exercise.primaryImage
  const attribution = resolveMediaAttribution(displayedMedia, exercise)
  return (
    <ScreenScrollView contentContainerStyle={styles.content}>
      <Text style={styles.eyebrow}>{exercise.source}</Text>
      <Text style={styles.title}>{exercise.name}</Text>
      <Text style={styles.meta}>{exercise.primaryMuscleGroup} · {exercise.equipment}</Text>
      {exercise.primaryVideoUrl && showVideo ? (
        <ExerciseVideo
          key={retryKey}
          url={exercise.primaryVideoUrl}
          posterUrl={exercise.primaryImageUrl}
          onRetry={() => setRetryKey((value) => value + 1)}
        />
      ) : exercise.primaryImageUrl ? (
        <Image accessibilityLabel={`Demonstração de ${exercise.name}`} source={{ uri: exercise.primaryImageUrl }} style={styles.image} />
      ) : (
        <View style={styles.empty}><Text style={styles.muted}>Este exercício não precisa de mídia para funcionar.</Text></View>
      )}
      {!!exercise.primaryVideoUrl && !showVideo && (
        <Pressable accessibilityRole="button" style={({ pressed }) => [styles.videoButton, pressed && styles.pressed]} onPress={() => setShowVideo(true)}>
          <Text style={styles.videoButtonText}>▶ Reproduzir vídeo</Text>
          <Text style={styles.videoHint}>Pode exigir internet se não estiver salvo no aparelho.</Text>
        </Pressable>
      )}
      {!!exercise.description && <Text style={styles.body}>{exercise.description}</Text>}
      {!!exercise.instructions && <><Text style={styles.heading}>Como executar</Text><Text style={styles.body}>{exercise.instructions}</Text></>}
      <Text style={styles.attribution}>Fonte: {attributionLabel(attribution)}</Text>
      {!!attribution.sourceUrl && <Pressable accessibilityRole="link" onPress={() => void Linking.openURL(attribution.sourceUrl!)} style={styles.linkButton}><Text style={styles.link}>Abrir fonte original</Text></Pressable>}
      {!!attribution.licenseUrl && <Pressable accessibilityRole="link" onPress={() => void Linking.openURL(attribution.licenseUrl!)} style={styles.linkButton}><Text style={styles.link}>Consultar licença</Text></Pressable>}
    </ScreenScrollView>
  )
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  content: { gap: 14 },
  center: { alignItems: 'center', flex: 1, justifyContent: 'center', padding: 24 },
  eyebrow: { color: colors.gray500, fontSize: 12, fontWeight: '800', letterSpacing: 2 },
  title: { color: colors.ink, fontSize: 32, fontWeight: '800' },
  meta: { color: colors.gray500, fontSize: 13, marginBottom: 4 },
  image: { aspectRatio: 16 / 9, backgroundColor: colors.gray200, borderRadius: 18, width: '100%' },
  empty: { alignItems: 'center', backgroundColor: colors.card, borderRadius: 18, padding: 28 },
  heading: { color: colors.ink, fontSize: 16, fontWeight: '800', marginTop: 8 },
  body: { color: colors.ink, fontSize: 14, lineHeight: 22 },
  muted: { color: colors.gray500, textAlign: 'center' },
  attribution: { color: colors.gray500, fontSize: 12, lineHeight: 17 },
  link: { color: colors.primary, fontSize: 13, fontWeight: '800', paddingVertical: 4 },
  videoButton: { backgroundColor: colors.primary, borderRadius: 16, minHeight: 56, padding: 15 },
  videoButtonText: { color: colors.onPrimary, fontSize: 14, fontWeight: '800' },
  videoHint: { color: colors.onPrimary, fontSize: 12, marginTop: 5 },
  linkButton: { justifyContent: 'center', minHeight: 48 },
  pressed: { opacity: 0.72 },
})
