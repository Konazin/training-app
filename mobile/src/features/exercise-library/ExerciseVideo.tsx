import { useEffect } from 'react'
import { Image, Pressable, StyleSheet, Text, View } from 'react-native'
import { VideoView, useVideoPlayer } from 'expo-video'
import { useEvent } from 'expo'
import { useIsFocused } from '@react-navigation/native'
import { useTheme } from '../../theme'
import { videoPresentation } from './libraryState'

export function ExerciseVideo({ url, posterUrl, onRetry }: {
  url: string
  posterUrl?: string | null
  onRetry: () => void
}) {
  const { colors } = useTheme()
  const themedStyles = createStyles(colors)
  const focused = useIsFocused()
  const player = useVideoPlayer(url, (created) => {
    created.loop = false
    created.pause()
  })
  const { status, error } = useEvent(player, 'statusChange', { status: player.status })
  const presentation = videoPresentation(status, Boolean(posterUrl))

  useEffect(() => {
    if (!focused) player.pause()
  }, [focused, player])
  useEffect(() => () => {
    player.pause()
    player.currentTime = 0
  }, [player])

  return (
    <View>
      {presentation === 'player' ? <VideoView
        accessibilityLabel="Vídeo de demonstração do exercício"
        contentFit="contain"
        nativeControls
        player={player}
        style={[styles.video, { backgroundColor: colors.black }]}
      /> : <View style={themedStyles.failure}>
        {!!posterUrl && <Image accessibilityLabel="Imagem de demonstração" source={{ uri: posterUrl }} style={styles.poster} />}
        <Text style={themedStyles.failureText}>
          {presentation.startsWith('error')
            ? error?.message || 'Não foi possível reproduzir o vídeo.'
            : 'Carregando vídeo…'}
        </Text>
      </View>}
      {presentation.startsWith('error') && <Pressable accessibilityRole="button" onPress={onRetry}>
          <Text style={[styles.retry, { color: colors.primary }]}>Recarregar vídeo</Text>
        </Pressable>}
    </View>
  )
}

const styles = StyleSheet.create({
  video: { aspectRatio: 16 / 9, borderRadius: 18, overflow: 'hidden', width: '100%' },
  retry: { fontSize: 12, fontWeight: '700', paddingVertical: 12, textAlign: 'center' },
  poster: { height: '100%', opacity: 0.5, position: 'absolute', width: '100%' },
})

const createStyles = (colors: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  failure: { alignItems: 'center', aspectRatio: 16 / 9, backgroundColor: colors.nearBlack, borderColor: colors.border, borderRadius: 18, borderWidth: 1, justifyContent: 'center', overflow: 'hidden' },
  failureText: { color: colors.white, fontSize: 12, padding: 20, textAlign: 'center' },
})
