import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { ScreenHeader } from '../../../components/ScreenHeader'
import type { RootStackParamList } from '../../../core/navigation/types'
import type { TrainingPlan } from '../model/trainingPlan'
import { shared, type ThemeColors, useTheme } from '../../../theme'

const weekday = {
  MONDAY: 'SEG',
  TUESDAY: 'TER',
  WEDNESDAY: 'QUA',
  THURSDAY: 'QUI',
  FRIDAY: 'SEX',
  SATURDAY: 'SÁB',
  SUNDAY: 'DOM',
} as const

export function TrainingPlanView({
  plans,
  selectedPlan,
  loading,
  onSelect,
  onStart,
}: {
  plans: TrainingPlan[]
  selectedPlan: TrainingPlan | undefined
  loading: boolean
  onSelect: (id: number) => void
  onStart: (planId: number, dayId: number) => Promise<boolean>
}) {
  const { colors } = useTheme()
  const styles = createStyles(colors)
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>()
  const visiblePlans = plans.filter((plan) => !plan.archived)

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <ScreenHeader
        eyebrow="Planejamento semanal"
        title={'Sua ficha\nde treino'}
        description="Escolha uma ficha e configure cada dia separadamente."
        action={(
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => navigation.navigate('TrainingPlanEditor')}
          >
            <Text style={styles.headerButtonText}>＋</Text>
          </TouchableOpacity>
        )}
      />
      <TouchableOpacity
        style={styles.archivedLink}
        onPress={() => navigation.navigate('ArchivedTrainingPlans')}
      >
        <Text style={styles.archivedLinkText}>Ver fichas arquivadas</Text>
      </TouchableOpacity>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.planScroll}>
        {visiblePlans.map((plan) => (
          <TouchableOpacity
            key={plan.id}
            style={[styles.planChip, selectedPlan?.id === plan.id && styles.planChipActive]}
            onPress={() => onSelect(plan.id)}
          >
            <Text style={[styles.planName, selectedPlan?.id === plan.id && styles.inverse]}>
              {plan.name}
            </Text>
            <Text style={styles.planMeta}>{plan.active ? '● ativa' : plan.category}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {!selectedPlan ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>{loading ? 'Carregando fichas…' : 'Nenhuma ficha disponível'}</Text>
          {!loading && (
            <TouchableOpacity style={styles.primary} onPress={() => navigation.navigate('TrainingPlanEditor')}>
              <Text style={styles.primaryText}>Criar ficha</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <>
          <View style={styles.planHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.eyebrow}>{selectedPlan.category} · {selectedPlan.difficulty}</Text>
              <Text style={styles.title}>{selectedPlan.name}</Text>
              {!!selectedPlan.description && <Text style={styles.description}>{selectedPlan.description}</Text>}
            </View>
            <TouchableOpacity
              style={styles.secondary}
              onPress={() => navigation.navigate('TrainingPlanEditor', { planId: selectedPlan.id })}
            >
              <Text style={styles.secondaryText}>Editar</Text>
            </TouchableOpacity>
          </View>

          {selectedPlan.days.map((day) => (
            <View key={day.id} style={styles.dayCard}>
              <TouchableOpacity
                style={styles.dayBody}
                onPress={() => navigation.navigate('TrainingPlanDay', {
                  planId: selectedPlan.id,
                  dayId: day.id,
                })}
              >
                <View style={[styles.dayBadge, day.restDay && styles.restBadge]}>
                  <Text style={styles.dayBadgeText}>{weekday[day.weekday]}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.dayTitle}>
                    {day.restDay ? 'Dia de descanso' : day.title || 'Treino a configurar'}
                  </Text>
                  <Text style={styles.dayMeta}>
                    {day.restDay
                      ? `${day.restActivities.length} atividades opcionais`
                      : `${day.exercises.length} exercícios · ${day.estimatedDurationMinutes} min`}
                  </Text>
                </View>
                <Text style={styles.arrow}>→</Text>
              </TouchableOpacity>
              {!day.restDay && day.exercises.length > 0 && (
                <TouchableOpacity
                  style={styles.start}
                  onPress={() => void onStart(selectedPlan.id, day.id)}
                >
                  <Text style={styles.startText}>Iniciar</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
        </>
      )}
    </ScrollView>
  )
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  content: { padding: shared.pagePadding, paddingBottom: 110 },
  headerButton: { alignItems: 'center', backgroundColor: colors.primary, borderRadius: 15, height: 44, justifyContent: 'center', width: 44 },
  headerButtonText: { color: colors.onPrimary, fontSize: 20 },
  archivedLink: { alignSelf: 'flex-start', marginBottom: 12 },
  archivedLinkText: { color: colors.gray500, fontSize: 9, fontWeight: '700' },
  planScroll: { marginBottom: 14 },
  planChip: { backgroundColor: colors.card, borderColor: colors.gray200, borderRadius: 16, borderWidth: 1, marginRight: 8, minWidth: 145, padding: 12 },
  planChipActive: { backgroundColor: colors.nearBlack },
  planName: { color: colors.ink, fontSize: 10, fontWeight: '800' },
  planMeta: { color: colors.gray500, fontSize: 8, marginTop: 5 },
  inverse: { color: '#fff' },
  planHeader: { alignItems: 'flex-start', backgroundColor: colors.card, borderRadius: 21, flexDirection: 'row', gap: 10, marginBottom: 10, padding: 16 },
  eyebrow: { color: colors.gray400, fontSize: 8, fontWeight: '800', textTransform: 'uppercase' },
  title: { color: colors.ink, fontSize: 21, fontWeight: '800', marginTop: 5 },
  description: { color: colors.gray500, fontSize: 10, lineHeight: 15, marginTop: 6 },
  secondary: { borderColor: colors.gray200, borderRadius: 13, borderWidth: 1, padding: 10 },
  secondaryText: { color: colors.ink, fontSize: 9, fontWeight: '800' },
  dayCard: { backgroundColor: colors.card, borderColor: colors.gray200, borderRadius: 18, borderWidth: 1, marginBottom: 8, overflow: 'hidden' },
  dayBody: { alignItems: 'center', flexDirection: 'row', gap: 11, padding: 12 },
  dayBadge: { alignItems: 'center', backgroundColor: colors.nearBlack, borderRadius: 13, height: 43, justifyContent: 'center', width: 43 },
  restBadge: { backgroundColor: colors.gray500 },
  dayBadgeText: { color: '#fff', fontSize: 8, fontWeight: '800' },
  dayTitle: { color: colors.ink, fontSize: 11, fontWeight: '800' },
  dayMeta: { color: colors.gray500, fontSize: 8, marginTop: 4 },
  arrow: { color: colors.gray400, fontSize: 17 },
  start: { alignItems: 'center', borderTopColor: colors.gray100, borderTopWidth: 1, padding: 10 },
  startText: { color: colors.ink, fontSize: 9, fontWeight: '800' },
  empty: { alignItems: 'center', minHeight: 280, justifyContent: 'center' },
  emptyTitle: { color: colors.ink, fontSize: 16, fontWeight: '700', marginBottom: 15 },
  primary: { backgroundColor: colors.primary, borderRadius: 14, paddingHorizontal: 18, paddingVertical: 13 },
  primaryText: { color: colors.onPrimary, fontSize: 10, fontWeight: '800' },
})
