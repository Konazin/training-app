import { useEffect, useState } from 'react'
import { Image, Linking, Pressable, StyleSheet, Text, View } from 'react-native'
import { ArrowLeft, Heart, Pencil, Play } from 'lucide-react-native'
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native'
import type { ExerciseDefinition } from '@training/training-domain'
import type { RootStackParamList } from '../../navigation/types'
import { Screen, ScreenScrollView } from '../../components/Screen'
import { PrimaryButton } from '../../components/PrimaryButton'
import { ThemedTextInput } from '../../components/ThemedTextInput'
import { shared, type ThemeColors, useTheme } from '../../theme'
import { fontFamilies } from '../../theme/typography'
import { ExerciseVideo } from './ExerciseVideo'
import { canonicalMuscle, equipmentLabel } from './exerciseTaxonomy'
import { ExercisePlaceholder } from './ExercisePlaceholder'
import {
  attributionLabel,
  exerciseCategoryLabel,
  resolveExerciseMedia,
  resolveMediaAttribution,
} from './libraryState'

export function ExerciseDetailScreen({
  exercises,
  onFavorite,
  onOpened,
  onUpdateNotes,
}: {
  exercises: ExerciseDefinition[]
  onFavorite: (id: number, favorite: boolean) => Promise<boolean>
  onOpened: (id: number) => Promise<boolean>
  onUpdateNotes: (id: number, notes: string) => Promise<boolean>
}) {
  const route = useRoute<RouteProp<RootStackParamList, 'ExerciseDetail'>>()
  const navigation = useNavigation()
  const { colors } = useTheme()
  const styles = createStyles(colors)
  const [showVideo, setShowVideo] = useState(false)
  const [retryKey, setRetryKey] = useState(0)
  const [imageFailed, setImageFailed] = useState(false)
  const [editingNotes, setEditingNotes] = useState(false)
  const [notes, setNotes] = useState('')
  const [message, setMessage] = useState('')
  const exercise = exercises.find((item) => item.id === route.params.exerciseId)

  useEffect(() => {
    void onOpened(route.params.exerciseId)
  }, [onOpened, route.params.exerciseId])
  useEffect(() => {
    if (exercise && !editingNotes) setNotes(exercise.notes)
  }, [editingNotes, exercise?.id, exercise?.notes])

  if (!exercise) {
    return <Screen><View style={styles.center}><Text style={styles.muted}>Exercício não encontrado.</Text></View></Screen>
  }

  const imageMedia = resolveExerciseMedia(exercise, 'IMAGE')
  const videoMedia = exercise.hasVideo ? resolveExerciseMedia(exercise, 'VIDEO') : null
  const displayedAttribution = showVideo && videoMedia ? videoMedia.attribution : imageMedia.attribution
  const fallbackAttribution = resolveMediaAttribution(null, exercise)
  const source = { BUNDLED: 'Integrado', SYSTEM: 'Sistema', CUSTOM: 'Personalizado', WGER: 'Wger', EXERCISEDB: 'ExerciseDB' }[exercise.source]

  const saveNotes = async () => {
    const success = await onUpdateNotes(exercise.id, notes)
    setMessage(success ? 'Notas salvas neste aparelho.' : 'Não foi possível salvar as notas.')
    if (success) setEditingNotes(false)
  }

  return (
    <ScreenScrollView contentContainerStyle={styles.content}>
      <View style={styles.topActions}>
        <Pressable accessibilityLabel="Voltar" accessibilityRole="button" onPress={() => navigation.goBack()} style={styles.action}>
          <ArrowLeft color={colors.tx} size={17} strokeWidth={1.7} />
          <Text style={styles.actionText}>Voltar</Text>
        </Pressable>
        <Pressable
          accessibilityLabel={exercise.favorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
          accessibilityRole="button"
          accessibilityState={{ selected: exercise.favorite }}
          onPress={() => void onFavorite(exercise.id, !exercise.favorite)}
          style={styles.action}
        >
          <Heart color={colors.tx} fill={exercise.favorite ? colors.tx : 'transparent'} size={17} strokeWidth={1.7} />
          <Text style={styles.favorite}>{exercise.favorite ? 'Favorito' : 'Favoritar'}</Text>
        </Pressable>
      </View>
      <Text style={styles.title}>{exercise.name}</Text>
      <Text style={styles.meta}>{canonicalMuscle(exercise.primaryMuscleGroup)} · {equipmentLabel(exercise.equipment)} · {source}</Text>

      {showVideo && videoMedia?.kind === 'VIDEO' ? (
        <ExerciseVideo
          key={retryKey}
          url={videoMedia.uri}
          posterUrl={imageMedia.kind === 'IMAGE' ? imageMedia.uri : null}
          onRetry={() => setRetryKey((value) => value + 1)}
        />
      ) : imageMedia.kind === 'IMAGE' && !imageFailed ? (
        <Image
          accessibilityLabel={`Mídia de ${exercise.name}`}
          onError={() => setImageFailed(true)}
          resizeMode="contain"
          source={{ uri: imageMedia.uri }}
          style={styles.image}
        />
      ) : (
        <ExercisePlaceholder
          kind={imageMedia.kind === 'PLACEHOLDER' || imageMedia.kind === 'MISSING'
            ? imageMedia.placeholder
            : 'STRENGTH'}
          missing={imageFailed || imageMedia.kind === 'MISSING'}
        />
      )}

      {videoMedia?.kind === 'VIDEO' && !showVideo && (
        <Pressable
          accessibilityHint="O vídeo só será carregado após esta ação."
          accessibilityRole="button"
          onPress={() => setShowVideo(true)}
          style={({ pressed }) => [styles.videoButton, pressed && styles.pressed]}
        >
          <View style={styles.videoLabel}><Play color={colors.on} size={16} strokeWidth={1.7} /><Text style={styles.videoButtonText}>Reproduzir vídeo</Text></View>
          <Text style={styles.videoHint}>Carregamento somente após sua ação.</Text>
        </Pressable>
      )}

      <Info label="Grupo principal" value={exercise.primaryMuscleGroup} />
      <Info label="Grupos secundários" value={exercise.secondaryMuscleGroups.join(', ') || 'Nenhum informado'} />
      <Info label="Equipamento" value={exercise.equipment} />
      <Info label="Categoria" value={exerciseCategoryLabel(exercise.category)} />
      <Info label="Dificuldade" value={exercise.difficulty} />
      <Info label="Tipo" value={`${exercise.unilateral ? 'Unilateral' : 'Bilateral'} · ${exercise.timed ? 'Por tempo' : 'Por repetições'}`} />

      <Text style={styles.heading}>Descrição</Text>
      <Text style={styles.body}>{exercise.description || 'Sem descrição.'}</Text>
      <Text style={styles.heading}>Como executar</Text>
      <Text style={styles.body}>{exercise.instructions || 'Sem instruções.'}</Text>

      <View style={styles.notesCard}>
        <View style={styles.notesHeader}>
          <Text style={styles.heading}>Minhas notas</Text>
          {!editingNotes && (
            <Pressable accessibilityRole="button" onPress={() => setEditingNotes(true)} style={styles.action}>
              <Pencil color={colors.tx} size={15} strokeWidth={1.7} />
              <Text style={styles.actionText}>Editar notas</Text>
            </Pressable>
          )}
        </View>
        {editingNotes ? (
          <>
            <ThemedTextInput
              accessibilityLabel="Notas pessoais do exercício"
              maxLength={4000}
              multiline
              onChangeText={setNotes}
              placeholder="Anotações pessoais"
              style={styles.notesInput}
              value={notes}
            />
            <View style={styles.noteActions}>
              <PrimaryButton label="Cancelar" onPress={() => {
                setNotes(exercise.notes)
                setEditingNotes(false)
              }} secondary />
              <PrimaryButton label="Salvar notas" onPress={() => void saveNotes()} />
            </View>
          </>
        ) : <Text style={styles.body}>{exercise.notes || 'Nenhuma nota pessoal.'}</Text>}
      </View>

      {!!message && <Text accessibilityLiveRegion="polite" style={styles.message}>{message}</Text>}
      <Text style={styles.attribution}>
        Fonte da mídia: {attributionLabel(displayedAttribution)}
      </Text>
      {imageMedia.kind === 'PLACEHOLDER' && (
        <Text style={styles.attribution}>Ilustração genérica do aplicativo.</Text>
      )}
      {!!displayedAttribution.sourceUrl && (
        <Pressable accessibilityRole="link" onPress={() => void Linking.openURL(displayedAttribution.sourceUrl!)} style={styles.linkButton}>
          <Text style={styles.link}>Abrir fonte original</Text>
        </Pressable>
      )}
      {!!displayedAttribution.licenseUrl && (
        <Pressable accessibilityRole="link" onPress={() => void Linking.openURL(displayedAttribution.licenseUrl!)} style={styles.linkButton}>
          <Text style={styles.link}>Consultar licença</Text>
        </Pressable>
      )}
      {!Object.values(displayedAttribution).some(Boolean) && Object.values(fallbackAttribution).some(Boolean) && (
        <Text style={styles.attribution}>{attributionLabel(fallbackAttribution)}</Text>
      )}
    </ScreenScrollView>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  const { colors } = useTheme()
  const styles = createStyles(colors)
  return (
    <View style={styles.info}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  )
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  content: { gap: 14, paddingBottom: 32 },
  center: { alignItems: 'center', flex: 1, justifyContent: 'center', padding: 24 },
  topActions: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  action: { alignItems: 'center', flexDirection: 'row', gap: 6, justifyContent: 'center', minHeight: shared.touchTarget.minimum, paddingHorizontal: 4 },
  actionText: { color: colors.tx, fontFamily: fontFamilies.text, fontSize: 14, fontWeight: '500' },
  favorite: { color: colors.tx, fontFamily: fontFamilies.text, fontSize: 14, fontWeight: '500' },
  title: { color: colors.tx, fontFamily: fontFamilies.text, fontSize: 32, fontWeight: '500' },
  meta: { color: colors.t2, fontFamily: fontFamilies.text, fontSize: 14, marginBottom: 4 },
  image: { aspectRatio: 16 / 9, backgroundColor: colors.s2, borderRadius: 8, width: '100%' },
  heading: { color: colors.tx, fontFamily: fontFamilies.text, fontSize: 16, fontWeight: '500', marginTop: 8 },
  body: { color: colors.tx, fontFamily: fontFamilies.text, fontSize: 14, lineHeight: 22 },
  muted: { color: colors.t2, fontFamily: fontFamilies.text, textAlign: 'center' },
  info: { borderBottomColor: colors.bd, borderBottomWidth: 1, paddingBottom: 10 },
  infoLabel: { color: colors.t2, fontFamily: fontFamilies.text, fontSize: 12 },
  infoValue: { color: colors.tx, fontFamily: fontFamilies.text, fontSize: 14, marginTop: 3 },
  notesCard: { borderBottomColor: colors.bd, borderBottomWidth: 1, paddingBottom: 14 },
  notesHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  notesInput: { minHeight: 110, textAlignVertical: 'top' },
  noteActions: { flexDirection: 'row', gap: 8, justifyContent: 'flex-end', marginTop: 10 },
  message: { color: colors.tx, fontFamily: fontFamilies.text, fontSize: 14 },
  attribution: { color: colors.t2, fontFamily: fontFamilies.text, fontSize: 12, lineHeight: 17 },
  link: { color: colors.tx, fontFamily: fontFamilies.text, fontSize: 13, fontWeight: '500', paddingVertical: 4, textDecorationLine: 'underline' },
  videoButton: { backgroundColor: colors.ac, borderRadius: 12, minHeight: 56, padding: 15 },
  videoLabel: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  videoButtonText: { color: colors.on, fontFamily: fontFamilies.text, fontSize: 14, fontWeight: '500' },
  videoHint: { color: colors.on, fontFamily: fontFamilies.text, fontSize: 12, marginTop: 5 },
  linkButton: { justifyContent: 'center', minHeight: shared.touchTarget.minimum },
  pressed: { opacity: 0.72 },
})
