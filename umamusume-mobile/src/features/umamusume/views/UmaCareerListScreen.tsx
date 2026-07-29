import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import type { RootStackParamList } from '../../../core/navigation/types'
import type { CareerStatus, UmaCareer } from '../model/umaCareer'
import { shared, type ThemeColors, useTheme } from '../../../theme'

const STATUS_LABELS: Record<CareerStatus, string> = {
  ACTIVE: 'ATIVA',
  COMPLETED: 'CONCLUÍDA',
  ABANDONED: 'ABANDONADA',
}

export function UmaCareerListScreen({
  careers,
  selectedCareerId,
  onSelect,
}: {
  careers: UmaCareer[]
  selectedCareerId: number | null
  onSelect: (id: number) => void
}) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>()
  const { colors } = useTheme()
  const styles = createStyles(colors)

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <TouchableOpacity onPress={() => navigation.goBack()}>
        <Text style={styles.back}>← Voltar</Text>
      </TouchableOpacity>
      <Text style={styles.eyebrow}>MODO UMAMUSUME</Text>
      <Text style={styles.title}>Todas as carreiras</Text>
      {!careers.length && <Text style={styles.empty}>Nenhuma carreira criada.</Text>}
      {careers.map((career) => (
        <TouchableOpacity
          key={career.id}
          onPress={() => {
            onSelect(career.id)
            navigation.goBack()
          }}
          style={[styles.card, selectedCareerId === career.id && styles.selected]}
        >
          <View style={styles.row}>
            <Text style={styles.name}>{career.name}</Text>
            <Text style={[styles.status, career.status === 'ABANDONED' && styles.abandoned]}>
              {STATUS_LABELS[career.status]}
            </Text>
          </View>
          <Text style={styles.meta}>
            {career.trainingPlan.name} · Semana {career.currentWeek} de {career.totalWeeks}
          </Text>
          <Text style={styles.meta}>
            Criada em {new Date(career.createdAt).toLocaleDateString('pt-BR')}
          </Text>
          <View style={styles.stats}>
            <Stat label="FOR" value={career.strength} />
            <Stat label="RES" value={career.endurance} />
            <Stat label="AGI" value={career.agility} />
            <Stat label="TEC" value={career.technique} />
            <Stat label="DIS" value={career.discipline} />
          </View>
        </TouchableOpacity>
      ))}
    </ScrollView>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  const { colors } = useTheme()
  const styles = createStyles(colors)
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  )
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  content: { padding: shared.pagePadding, paddingBottom: 45 },
  back: { color: colors.gray500, fontSize: 10, fontWeight: '700', marginBottom: 25, marginTop: 8, paddingVertical: 5 },
  eyebrow: { color: colors.gray500, fontSize: 8, fontWeight: '800', letterSpacing: 1.3 },
  title: { color: colors.ink, fontSize: 28, fontWeight: '800', marginBottom: 20, marginTop: 5 },
  empty: { color: colors.gray500, fontSize: 10, paddingVertical: 30, textAlign: 'center' },
  card: { backgroundColor: colors.card, borderColor: colors.gray200, borderRadius: 19, borderWidth: 1, marginBottom: 9, padding: 15 },
  selected: { borderColor: colors.ink, borderWidth: 2 },
  row: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  name: { color: colors.ink, flex: 1, fontSize: 14, fontWeight: '800' },
  status: { color: '#15803d', fontSize: 7, fontWeight: '800' },
  abandoned: { color: colors.danger },
  meta: { color: colors.gray500, fontSize: 9, marginTop: 5 },
  stats: { flexDirection: 'row', gap: 6, marginTop: 13 },
  stat: { alignItems: 'center', backgroundColor: colors.surface, borderRadius: 10, flex: 1, paddingVertical: 8 },
  statValue: { color: colors.ink, fontSize: 12, fontWeight: '800' },
  statLabel: { color: colors.gray500, fontSize: 6, marginTop: 2 },
})
