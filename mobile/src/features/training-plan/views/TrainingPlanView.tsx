import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { ChevronRight, ClipboardList, Play, Plus } from 'lucide-react-native'
import { PrimaryButton } from '../../../components/PrimaryButton'
import { ScreenHeader } from '../../../components/ScreenHeader'
import { SelectableChip } from '../../../components/SelectableChip'
import { EmptyState } from '../../../components/ui'
import { PressableScale, Reveal } from '../../../motion'
import { ScreenScrollView } from '../../../components/Screen'
import type { RootStackParamList } from '../../../navigation/types'
import type { TrainingPlan } from '../model/trainingPlan'
import { shared, type ThemeColors, useTheme } from '../../../theme'
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
      <Reveal>
        <ScreenHeader
          title="Ficha"
          description="Escolha uma ficha e organize os dias de treino."
          action={(
            <PressableScale
              accessibilityLabel="Criar ficha"
              accessibilityRole="button"
              style={styles.headerButton}
              onPress={() => navigation.navigate('TrainingPlanEditor')}
            >
              <Plus color={colors.on} size={22} strokeWidth={1.8} />
            </PressableScale>
          )}
        />
      </Reveal>
      {visiblePlans.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.planScroll} contentContainerStyle={styles.planChips}>
          {visiblePlans.map((plan) => (
            <SelectableChip
              key={plan.id}
              label={plan.active ? `${plan.name} · ativa` : plan.name}
              selected={selectedPlan?.id === plan.id}
              onPress={() => onSelect(plan.id)}
            />
          ))}
        </ScrollView>
      )}

      {!selectedPlan ? (
        <EmptyState
          action={!loading ? <PrimaryButton label="Criar ficha" onPress={() => navigation.navigate('TrainingPlanEditor')} /> : undefined}
          description={loading ? 'Um instante…' : 'Crie uma ficha para organizar a semana de treino.'}
          icon={<ClipboardList color={colors.tx} size={24} strokeWidth={1.5} />}
          title={loading ? 'Carregando fichas…' : 'Nenhuma ficha disponível'}
        />
      ) : (
        <>
          <Reveal index={1}>
            <View style={styles.planHeader}>
              <View style={styles.planCopy}>
                <Text style={styles.title}>{selectedPlan.name}</Text>
                <Text style={styles.planMeta}>{selectedPlan.category} · {selectedPlan.difficulty}</Text>
                {!!selectedPlan.description && <Text style={styles.description}>{selectedPlan.description}</Text>}
              </View>
              <PressableScale
                accessibilityRole="button"
                style={styles.secondary}
                onPress={() => navigation.navigate('TrainingPlanEditor', { planId: selectedPlan.id })}
              >
                <Text style={styles.secondaryText}>Editar</Text>
              </PressableScale>
            </View>
          </Reveal>

          {selectedPlan.days.map((day, index) => (
            <Reveal index={index + 2} key={day.id}>
              <View style={styles.dayCard}>
                <PressableScale
                  accessibilityRole="button"
                  pressedScale={0.99}
                  style={styles.dayBody}
                  onPress={() => navigation.navigate('TrainingPlanDay', {
                    planId: selectedPlan.id,
                    dayId: day.id,
                  })}
                >
                  <View style={[styles.dayBadge, day.restDay && styles.restBadge]}>
                    <Text style={styles.dayBadgeText}>{weekday[day.weekday]}</Text>
                  </View>
                  <View style={styles.dayCopy}>
                    <Text style={styles.dayTitle}>
                      {day.restDay ? 'Dia de descanso' : day.title || 'Treino a configurar'}
                    </Text>
                    <Text style={styles.dayMeta}>
                      {day.restDay
                        ? `${day.restActivities.length} atividades opcionais`
                        : `${day.exercises.length} exercícios · ${day.estimatedDurationMinutes} min`}
                    </Text>
                  </View>
                  {(day.restDay || day.exercises.length === 0) && <ChevronRight color={colors.mu} size={20} strokeWidth={1.7} />}
                </PressableScale>
                {!day.restDay && day.exercises.length > 0 && (
                  <PressableScale
                    accessibilityLabel={`Iniciar ${day.title || weekday[day.weekday]}`}
                    accessibilityRole="button"
                    style={styles.start}
                    onPress={() => void onStart(selectedPlan.id, day.id)}
                  >
                    <Play color={colors.on} fill={colors.on} size={14} strokeWidth={1.5} />
                    <Text style={styles.startText}>Iniciar</Text>
                  </PressableScale>
                )}
              </View>
            </Reveal>
          ))}
          <Reveal index={9}>
            <PressableScale
              accessibilityRole="button"
              style={styles.archivedLink}
              onPress={() => navigation.navigate('ArchivedTrainingPlans')}
            >
              <Text style={styles.archivedLinkText}>Ver fichas arquivadas</Text>
            </PressableScale>
          </Reveal>
        </>
      )}
    </ScreenScrollView>
  )
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  headerButton: { alignItems: 'center', backgroundColor: colors.ac, borderRadius: 24, height: 48, justifyContent: 'center', width: 48 },
  archivedLink: { alignSelf: 'flex-start', justifyContent: 'center', marginTop: shared.spacing.lg, minHeight: 48 },
  archivedLinkText: { ...typography.bodySmall, color: colors.t2 },
  planScroll: { flexGrow: 0, marginBottom: shared.spacing.xl },
  planChips: { gap: shared.spacing.sm, paddingRight: shared.spacing.lg },
  planHeader: { alignItems: 'flex-start', flexDirection: 'row', gap: shared.spacing.md, marginBottom: shared.spacing.lg },
  planCopy: { flex: 1 },
  planMeta: { ...typography.caption, color: colors.t2, marginTop: 4 },
  title: { ...typography.title, color: colors.tx },
  description: { ...typography.bodySmall, color: colors.t2, marginTop: shared.spacing.sm },
  secondary: { alignItems: 'center', borderColor: colors.mu, borderRadius: shared.radii.md, borderWidth: 1, justifyContent: 'center', minHeight: 48, paddingHorizontal: 16 },
  secondaryText: { ...typography.bodySmall, color: colors.tx, fontWeight: '500' },
  dayCard: { alignItems: 'center', borderBottomColor: colors.bd, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', gap: shared.spacing.sm },
  dayBody: { alignItems: 'center', flex: 1, flexDirection: 'row', gap: shared.spacing.md, minHeight: 72 },
  dayCopy: { flex: 1 },
  dayBadge: { alignItems: 'center', height: 36, justifyContent: 'center', width: 38 },
  restBadge: { borderColor: colors.bd, borderRadius: shared.radii.md, borderWidth: 1 },
  dayBadgeText: { ...typography.monoLabel, color: colors.t2 },
  dayTitle: { ...typography.body, color: colors.tx, fontWeight: '500' },
  dayMeta: { ...typography.caption, color: colors.t2, marginTop: 2 },
  start: { alignItems: 'center', backgroundColor: colors.ac, borderRadius: 24, flexDirection: 'row', gap: 6, justifyContent: 'center', minHeight: 48, paddingHorizontal: 18 },
  startText: { ...typography.bodySmall, color: colors.on, fontWeight: '600' },
})
