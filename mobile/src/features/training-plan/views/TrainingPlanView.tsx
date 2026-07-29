import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { ScreenHeader } from '../../../components/ScreenHeader'
import { ScreenScrollView } from '../../../components/Screen'
import type { RootStackParamList } from '../../../navigation/types'
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
    <ScreenScrollView includeBottomInset={false} showsVerticalScrollIndicator={false}>
      <ScreenHeader
        eyebrow="Planejamento semanal"
        title={'Sua ficha\nde treino'}
        description="Escolha uma ficha e configure cada dia separadamente."
        action={(
          <TouchableOpacity
            accessibilityLabel="Criar ficha"
            accessibilityRole="button"
            style={styles.headerButton}
            onPress={() => navigation.navigate('TrainingPlanEditor')}
          >
            <Text style={styles.headerButtonText}>＋</Text>
          </TouchableOpacity>
        )}
      />
      <TouchableOpacity
        accessibilityRole="button"
        style={styles.archivedLink}
        onPress={() => navigation.navigate('ArchivedTrainingPlans')}
      >
        <Text style={styles.archivedLinkText}>Ver fichas arquivadas</Text>
      </TouchableOpacity>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.planScroll}>
        {visiblePlans.map((plan) => (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityState={{ selected: selectedPlan?.id === plan.id }}
            key={plan.id}
            style={[styles.planChip, selectedPlan?.id === plan.id && styles.planChipActive]}
            onPress={() => onSelect(plan.id)}
          >
            <Text style={[styles.planName, selectedPlan?.id === plan.id && styles.inverse]}>
              {plan.name}
            </Text>
            <Text style={[styles.planMeta, selectedPlan?.id === plan.id && styles.inverse]}>
              {selectedPlan?.id === plan.id ? '✓ ' : ''}{plan.active ? 'ativa' : plan.category}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {!selectedPlan ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>{loading ? 'Carregando fichas…' : 'Nenhuma ficha disponível'}</Text>
          {!loading && (
            <TouchableOpacity accessibilityRole="button" style={styles.primary} onPress={() => navigation.navigate('TrainingPlanEditor')}>
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
              accessibilityRole="button"
              style={styles.secondary}
              onPress={() => navigation.navigate('TrainingPlanEditor', { planId: selectedPlan.id })}
            >
              <Text style={styles.secondaryText}>Editar</Text>
            </TouchableOpacity>
          </View>

          {selectedPlan.days.map((day) => (
            <View key={day.id} style={styles.dayCard}>
              <TouchableOpacity
                accessibilityRole="button"
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
                  accessibilityRole="button"
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
    </ScreenScrollView>
  )
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  headerButton: { alignItems: 'center', backgroundColor: colors.primary, borderRadius: 15, height: 48, justifyContent: 'center', width: 48 },
  headerButtonText: { color: colors.onPrimary, fontSize: 20 },
  archivedLink: { alignSelf: 'flex-start', justifyContent: 'center', marginBottom: 12, minHeight: 48 },
  archivedLinkText: { color: colors.gray500, fontSize: 12, fontWeight: '700' },
  planScroll: { marginBottom: 14 },
  planChip: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 16, borderWidth: 1, justifyContent: 'center', marginRight: 8, minHeight: 64, minWidth: 145, padding: 12 },
  planChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  planName: { color: colors.ink, fontSize: 12, fontWeight: '800' },
  planMeta: { color: colors.gray500, fontSize: 12, marginTop: 5 },
  inverse: { color: colors.onPrimary },
  planHeader: { alignItems: 'flex-start', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 21, borderWidth: 1, flexDirection: 'row', gap: 12, marginBottom: 10, padding: 16 },
  eyebrow: { color: colors.gray400, fontSize: 12, fontWeight: '800', textTransform: 'uppercase' },
  title: { color: colors.ink, fontSize: 21, fontWeight: '800', marginTop: 5 },
  description: { color: colors.gray500, fontSize: 14, lineHeight: 20, marginTop: 6 },
  secondary: { alignItems: 'center', borderColor: colors.border, borderRadius: 13, borderWidth: 1, justifyContent: 'center', minHeight: 48, paddingHorizontal: 12 },
  secondaryText: { color: colors.ink, fontSize: 12, fontWeight: '800' },
  dayCard: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 18, borderWidth: 1, marginBottom: 8, overflow: 'hidden' },
  dayBody: { alignItems: 'center', flexDirection: 'row', gap: 12, minHeight: 72, padding: 12 },
  dayBadge: { alignItems: 'center', backgroundColor: colors.primary, borderRadius: 13, height: 48, justifyContent: 'center', width: 48 },
  restBadge: { backgroundColor: colors.gray500 },
  dayBadgeText: { color: colors.onPrimary, fontSize: 12, fontWeight: '800' },
  dayTitle: { color: colors.ink, fontSize: 16, fontWeight: '800', lineHeight: 22 },
  dayMeta: { color: colors.gray500, fontSize: 14, lineHeight: 20, marginTop: 4 },
  arrow: { color: colors.gray400, fontSize: 17 },
  start: { alignItems: 'center', borderTopColor: colors.border, borderTopWidth: 1, justifyContent: 'center', minHeight: 48 },
  startText: { color: colors.primary, fontSize: 14, fontWeight: '800' },
  empty: { alignItems: 'center', minHeight: 280, justifyContent: 'center' },
  emptyTitle: { color: colors.ink, fontSize: 16, fontWeight: '700', marginBottom: 15 },
  primary: { alignItems: 'center', backgroundColor: colors.primary, borderRadius: 14, justifyContent: 'center', minHeight: 48, paddingHorizontal: 18 },
  primaryText: { color: colors.onPrimary, fontSize: 14, fontWeight: '800' },
})
