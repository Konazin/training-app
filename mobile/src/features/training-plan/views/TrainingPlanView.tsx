import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { Check, ChevronRight, Plus } from 'lucide-react-native'
import { ScreenHeader } from '../../../components/ScreenHeader'
import { ScreenScrollView } from '../../../components/Screen'
import type { RootStackParamList } from '../../../navigation/types'
import type { TrainingPlan } from '../model/trainingPlan'
import { type ThemeColors, useTheme } from '../../../theme'
import { typography } from '../../../theme/typography'

const weekday = {
  MONDAY: 'seg',
  TUESDAY: 'ter',
  WEDNESDAY: 'qua',
  THURSDAY: 'qui',
  FRIDAY: 'sex',
  SATURDAY: 'sáb',
  SUNDAY: 'dom',
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
        title="Ficha"
        description="Escolha uma ficha e organize os dias de treino."
        action={(
          <TouchableOpacity
            accessibilityLabel="Criar ficha"
            accessibilityRole="button"
            style={styles.headerButton}
            onPress={() => navigation.navigate('TrainingPlanEditor')}
          >
            <Plus color={colors.on} size={20} strokeWidth={1.8} />
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
            <View style={styles.planMetaRow}>
              {selectedPlan?.id === plan.id && <Check color={colors.on} size={13} />}
              <Text style={[styles.planMeta, selectedPlan?.id === plan.id && styles.inverse]}>
                {plan.active ? 'Ativa' : selectedPlan?.id === plan.id ? 'Selecionada' : 'Selecionar'}
              </Text>
            </View>
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
                <ChevronRight color={colors.mu} size={20} strokeWidth={1.7} />
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
  headerButton: { alignItems: 'center', backgroundColor: colors.ac, borderRadius: 12, height: 48, justifyContent: 'center', width: 48 },
  archivedLink: { alignSelf: 'flex-start', justifyContent: 'center', marginBottom: 12, minHeight: 48 },
  archivedLinkText: { ...typography.bodySmall, color: colors.tx, textDecorationLine: 'underline', textUnderlineOffset: 3 },
  planScroll: { marginBottom: 18 },
  planChip: { backgroundColor: 'transparent', borderColor: colors.mu, borderRadius: 12, borderWidth: 1, justifyContent: 'center', marginRight: 8, minHeight: 48, minWidth: 145, paddingHorizontal: 12 },
  planChipActive: { backgroundColor: colors.ac, borderColor: colors.ac },
  planName: { ...typography.label, color: colors.tx, fontWeight: '500' },
  planMetaRow: { alignItems: 'center', flexDirection: 'row', gap: 3, marginTop: 2 },
  planMeta: { ...typography.captionSmall, color: colors.t2 },
  inverse: { color: colors.on },
  planHeader: { alignItems: 'flex-start', flexDirection: 'row', gap: 12, marginBottom: 16, paddingVertical: 8 },
  eyebrow: { ...typography.monoLabel, color: colors.t2 },
  title: { ...typography.title, color: colors.tx, marginTop: 5 },
  description: { ...typography.bodySmall, color: colors.t2, marginTop: 6 },
  secondary: { alignItems: 'center', borderColor: colors.mu, borderRadius: 12, borderWidth: 1, justifyContent: 'center', minHeight: 48, paddingHorizontal: 14 },
  secondaryText: { ...typography.bodySmall, color: colors.tx },
  dayCard: { borderBottomColor: colors.bd, borderBottomWidth: 1 },
  dayBody: { alignItems: 'center', flexDirection: 'row', gap: 12, minHeight: 68 },
  dayBadge: { alignItems: 'center', height: 36, justifyContent: 'center', width: 38 },
  restBadge: { borderColor: colors.bd, borderRadius: 12, borderWidth: 1 },
  dayBadgeText: { ...typography.monoLabel, color: colors.t2 },
  dayTitle: { ...typography.body, color: colors.tx, fontWeight: '500' },
  dayMeta: { ...typography.caption, color: colors.t2, marginTop: 2 },
  start: { alignSelf: 'flex-start', justifyContent: 'center', minHeight: 48, paddingLeft: 50 },
  startText: { ...typography.bodySmall, color: colors.tx, textDecorationLine: 'underline', textUnderlineOffset: 3 },
  empty: { alignItems: 'flex-start', minHeight: 280, justifyContent: 'center' },
  emptyTitle: { ...typography.titleSmall, color: colors.tx, marginBottom: 15 },
  primary: { alignItems: 'center', backgroundColor: colors.ac, borderRadius: 12, justifyContent: 'center', minHeight: 56, paddingHorizontal: 18 },
  primaryText: { ...typography.label, color: colors.on, fontWeight: '500' },
})
