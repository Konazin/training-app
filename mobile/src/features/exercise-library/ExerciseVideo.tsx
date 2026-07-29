import { useEffect } from 'react'
import { Image, Pressable, StyleSheet, Text, View } from 'react-native'
import { VideoView, useVideoPlayer } from 'expo-video'
import { useEvent } from 'expo'
import { useIsFocused } from '@react-navigation/native'
import { useTheme } from '../../theme'
import { videoPresentation } from './libraryState'

export function ExerciseVideo({ url, posterUrl, retryKey, onRetry }: {
  url: string
  posterUrl?: string | null
  retryKey: number
  onRetry: () => void
}) {
  const { colors } = useTheme()
  const focused = useIsFocused()
  const player = useVideoPlayer(`${url}${url.includes('?') ? '&' : '?'}retry=${retryKey}`)
  const { status, error } = useEvent(player, 'statusChange', { status: player.status })
  const presentation = videoPresentation(status, Boolean(posterUrl))

  useEffect(() => {
    if (!focused) player.pause()
  }, [focused, player])

  return (
    <View>
      {presentation.startsWith('error') ? <View style={styles.failure}>
        {!!posterUrl && <Image accessibilityLabel="Imagem de demonstração" source={{ uri: posterUrl }} style={styles.poster} />}
        <Text style={styles.failureText}>{error?.message || 'Não foi possível reproduzir o vídeo.'}</Text>
      </View> : <VideoView
        accessibilityLabel="Vídeo de demonstração do exercício"
        contentFit="contain"
        nativeControls
        player={player}
        style={styles.video}
      />}
      <Pressable accessibilityRole="button" onPress={onRetry}>
        <Text style={[styles.retry, { color: colors.primary }]}>Recarregar vídeo</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  video: { aspectRatio: 16 / 9, backgroundColor: '#000', borderRadius: 18, overflow: 'hidden', width: '100%' },
  retry: { fontSize: 12, fontWeight: '700', paddingVertical: 12, textAlign: 'center' },
  failure: { alignItems: 'center', aspectRatio: 16 / 9, backgroundColor: '#111', borderRadius: 18, justifyContent: 'center', overflow: 'hidden' },
  poster: { height: '100%', opacity: 0.5, position: 'absolute', width: '100%' },
  failureText: { color: '#fff', fontSize: 12, padding: 20, textAlign: 'center' },
})
