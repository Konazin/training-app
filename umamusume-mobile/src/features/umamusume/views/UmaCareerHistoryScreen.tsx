import { useEffect } from 'react'
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import type { RootStackParamList } from '../../../core/navigation/types'
import type { UmaTurn } from '../model/umaCareer'
import { formatWeekday, turnsForCareer } from '../model/umaCareer'
import { shared, type ThemeColors, useTheme } from '../../../theme'

export function UmaCareerHistoryScreen({
  careerId,
  turns,
  turnsCareerId,
  loading,
  error,
  onLoad,
}: {
  careerId: number
  turns: UmaTurn[]
  turnsCareerId: number | null
  loading: boolean
  error: string
  onLoad: (careerId: number) => Promise<void>
}) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>()
  const { colors } = useTheme()
  const styles = createStyles(colors)
  const visibleTurns = turnsForCareer(turns, turnsCareerId, careerId)

  useEffect(() => {
    void onLoad(careerId)
  }, [careerId, onLoad])

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <TouchableOpacity onPress={() => navigation.goBack()}><Text style={styles.back}>← Voltar</Text></TouchableOpacity>
      <Text style={styles.eyebrow}>DIÁRIO DA CARREIRA</Text>
      <Text style={styles.title}>Histórico</Text>
      {loading && <Text style={styles.empty}>Carregando histórico…</Text>}
      {!loading && !!error && (
        <View style={styles.errorCard}>
          <Text style={styles.error}>{error}</Text>
          <TouchableOpacity onPress={() => void onLoad(careerId)} style={styles.retry}>
            <Text style={styles.retryText}>Tentar novamente</Text>
          </TouchableOpacity>
        </View>
      )}
      {!loading && !error && !visibleTurns.length && (
        <Text style={styles.empty}>Nenhuma ação concluída ainda.</Text>
      )}
      {!loading && !error && visibleTurns.map((turn) => (
        <View key={turn.id} style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.period}>SEMANA {turn.weekNumber} · {formatWeekday(turn.weekday).toUpperCase()}</Text>
            <Text style={[styles.status, turn.status === 'ABANDONED' && styles.abandoned]}>
              {turn.status === 'IN_PROGRESS' ? 'PENDENTE' : turn.status === 'COMPLETED' ? 'CONCLUÍDA' : 'ABANDONADA'}
            </Text>
          </View>
          <Text style={styles.action}>{turn.actionTitle}</Text>
          {!!turn.resultText && <Text style={styles.result}>{turn.resultText}</Text>}
        </View>
      ))}
    </ScrollView>
  )
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  content: { padding: shared.pagePadding, paddingBottom: 45 },
  back: { color: colors.gray500, fontSize: 10, fontWeight: '700', marginBottom: 25, marginTop: 8, paddingVertical: 5 },
  eyebrow: { color: colors.gray500, fontSize: 8, fontWeight: '800', letterSpacing: 1.3 },
  title: { color: colors.ink, fontSize: 28, fontWeight: '800', marginBottom: 20, marginTop: 5 },
  empty: { color: colors.gray500, fontSize: 10, paddingVertical: 30, textAlign: 'center' },
  card: { backgroundColor: colors.card, borderColor: colors.gray200, borderRadius: 18, borderWidth: 1, marginBottom: 8, padding: 15 },
  row: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  period: { color: colors.gray500, fontSize: 8, fontWeight: '800' },
  status: { color: '#15803d', fontSize: 7, fontWeight: '800' },
  abandoned: { color: colors.danger },
  action: { color: colors.ink, fontSize: 13, fontWeight: '800', marginBottom: 6, marginTop: 8 },
  result: { color: colors.gray500, fontSize: 9, lineHeight: 15 },
  errorCard: { alignItems: 'center', backgroundColor: colors.card, borderRadius: 16, gap: 12, padding: 16 },
  error: { color: colors.danger, fontSize: 10, textAlign: 'center' },
  retry: { backgroundColor: colors.primary, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 11 },
  retryText: { color: colors.onPrimary, fontSize: 9, fontWeight: '800' },
})
