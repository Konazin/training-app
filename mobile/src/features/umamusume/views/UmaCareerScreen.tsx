import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import type { UmaCareer } from '../model/umaCareer'
import {
  availableCareerAction,
  careerProgress,
  formatCareerPeriod,
  visualClamp,
} from '../model/umaCareer'
import { shared, type ThemeColors, useTheme } from '../../../theme'

interface Props {
  career: UmaCareer | null
  loading: boolean
  busyKey: string
  canContinueTraining: boolean
  onCreate: () => void
  onHistory: (careerId: number) => void
  onStartTraining: () => void
  onContinueTraining: () => void
  onAcceptRestActivity: (activityId: number) => Promise<boolean>
  onCompleteRestActivity: (activityId: number) => Promise<boolean>
  onFullRest: () => Promise<boolean>
  onAbandon: () => Promise<boolean>
}

export function UmaCareerScreen({
  career,
  loading,
  busyKey,
  canContinueTraining,
  onCreate,
  onHistory,
  onStartTraining,
  onContinueTraining,
  onAcceptRestActivity,
  onCompleteRestActivity,
  onFullRest,
  onAbandon,
}: Props) {
  const { colors } = useTheme()
  const styles = createStyles(colors)

  if (loading && !career) {
    return <Empty title="Carregando carreira…" description="Recuperando seu progresso." />
  }
  if (!career) {
    return (
      <Empty
        title="Modo Umamusume"
        description="Use uma ficha semanal real para evoluir durante 8, 12 ou 16 semanas."
        actionLabel="Criar carreira"
        onAction={onCreate}
      />
    )
  }

  const action = availableCareerAction(career)
  const progress = careerProgress(
    career.currentWeek,
    career.currentWeekday,
    career.totalWeeks,
    career.status,
  )
  const dayTitle = career.currentDay.title || career.trainingPlan.name
  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.hero}>
        <View style={styles.avatar}><Text style={styles.avatarText}>◎</Text></View>
        <View style={styles.heroText}>
          <Text style={styles.eyebrow}>MODO UMAMUSUME</Text>
          <Text style={styles.title}>{career.name}</Text>
          <Text style={styles.muted}>
            {formatCareerPeriod(career.currentWeek, career.totalWeeks, career.currentWeekday)}
          </Text>
        </View>
      </View>

      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progress}%` }]} />
      </View>
      <View style={styles.progressLabels}>
        <Text style={styles.small}>TEMPORADA</Text>
        <Text style={styles.small}>{Math.round(progress)}%</Text>
      </View>

      <Text style={styles.sectionTitle}>Atributos</Text>
      <View style={styles.attributes}>
        <Attribute label="Força" value={career.strength} />
        <Attribute label="Resistência" value={career.endurance} />
        <Attribute label="Agilidade" value={career.agility} />
        <Attribute label="Técnica" value={career.technique} />
        <Attribute label="Disciplina" value={career.discipline} />
      </View>

      <View style={styles.statusCard}>
        <StatusBar label="Energia" value={career.energy} color="#16a34a" />
        <StatusBar label="Fadiga" value={career.fatigue} color="#dc2626" />
        <StatusBar label="Humor" value={career.mood} color="#ca8a04" />
        <StatusBar label="Confiança" value={career.confidence} color="#2563eb" />
      </View>

      <View style={styles.dayCard}>
        <Text style={styles.eyebrow}>{career.currentDay.restDay ? 'DIA DE DESCANSO' : 'TREINO DO DIA'}</Text>
        <Text style={styles.dayTitle}>{dayTitle}</Text>
        <Text style={styles.muted}>
          Ficha: {career.trainingPlan.name}
          {!career.currentDay.restDay && ` · ${career.currentDay.exerciseCount} exercícios`}
          {career.currentDay.estimatedDurationMinutes > 0
            && ` · ${career.currentDay.estimatedDurationMinutes} min`}
        </Text>

        {action === 'START_TRAINING' && (
          <PrimaryAction
            disabled={Boolean(busyKey)}
            label={busyKey === 'training' ? 'Iniciando…' : 'Iniciar treino'}
            onPress={onStartTraining}
          />
        )}
        {action === 'CONTINUE_TRAINING' && (
          <PrimaryAction
            disabled={!canContinueTraining}
            label="Continuar treino"
            onPress={onContinueTraining}
          />
        )}
        {action === 'COMPLETE_REST_ACTIVITY' && career.pendingTurn && (
          <View style={styles.pending}>
            <Text style={styles.pendingLabel}>ATIVIDADE ACEITA</Text>
            <Text style={styles.pendingTitle}>{career.pendingTurn.actionTitle}</Text>
            <Text style={styles.muted}>
              {career.pendingTurn.activityDurationMinutes ?? 0} min
            </Text>
            <PrimaryAction
              disabled={Boolean(busyKey)}
              label={busyKey === 'rest' ? 'Concluindo…' : 'Concluir atividade'}
              onPress={() => void onCompleteRestActivity(career.pendingTurn!.restActivityId!)}
            />
          </View>
        )}
        {action === 'CHOOSE_REST' && (
          <View style={styles.actions}>
            {career.currentDay.restActivities.map((activity) => (
              <TouchableOpacity
                key={activity.id}
                disabled={Boolean(busyKey)}
                onPress={() => void onAcceptRestActivity(activity.id)}
                style={styles.activity}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.activityName}>{activity.name}</Text>
                  <Text style={styles.muted}>{activity.category} · {activity.estimatedDurationMinutes} min</Text>
                </View>
                <Text style={styles.arrow}>Aceitar →</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              disabled={Boolean(busyKey)}
              onPress={() => Alert.alert(
                'Descanso completo?',
                'As atividades opcionais serão recusadas neste dia.',
                [
                  { text: 'Cancelar', style: 'cancel' },
                  { text: 'Descansar', onPress: () => void onFullRest() },
                ],
              )}
              style={styles.secondaryAction}
            >
              <Text style={styles.secondaryText}>Descanso completo</Text>
            </TouchableOpacity>
          </View>
        )}
        {action === 'FINISHED' && (
          <View style={styles.final}>
            <Text style={styles.finalTitle}>
              {career.status === 'COMPLETED' ? 'Carreira concluída' : 'Carreira encerrada'}
            </Text>
            <Text style={styles.muted}>
              {career.status === 'COMPLETED'
                ? `${career.totalWeeks} semanas finalizadas. Confira sua evolução no histórico.`
                : 'O progresso foi preservado para consulta.'}
            </Text>
            <PrimaryAction label="Criar nova carreira" onPress={onCreate} />
          </View>
        )}
      </View>

      {!!career.lastResults[0] && (
        <View style={styles.resultCard}>
          <Text style={styles.eyebrow}>ÚLTIMO RESULTADO</Text>
          <Text style={styles.resultTitle}>{career.lastResults[0].actionTitle}</Text>
          <Text style={styles.resultText}>{career.lastResults[0].resultText}</Text>
        </View>
      )}

      <TouchableOpacity style={styles.history} onPress={() => onHistory(career.id)}>
        <Text style={styles.historyText}>Ver histórico da carreira</Text>
        <Text style={styles.arrow}>→</Text>
      </TouchableOpacity>

      {career.status === 'ACTIVE' && !career.pendingTurn && (
        <TouchableOpacity
          disabled={Boolean(busyKey)}
          onPress={() => Alert.alert(
            'Abandonar carreira?',
            'A carreira será encerrada e continuará disponível no histórico.',
            [
              { text: 'Cancelar', style: 'cancel' },
              { text: 'Abandonar', style: 'destructive', onPress: () => void onAbandon() },
            ],
          )}
        >
          <Text style={styles.abandon}>Abandonar carreira</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  )
}

function Attribute({ label, value }: { label: string; value: number }) {
  const { colors } = useTheme()
  const styles = createStyles(colors)
  return (
    <View style={styles.attribute}>
      <Text style={styles.attributeValue}>{visualClamp(value, 999)}</Text>
      <Text style={styles.attributeLabel}>{label}</Text>
    </View>
  )
}

function StatusBar({ label, value, color }: { label: string; value: number; color: string }) {
  const { colors } = useTheme()
  const styles = createStyles(colors)
  const safeValue = visualClamp(value)
  return (
    <View style={styles.barRow}>
      <View style={styles.barLabels}>
        <Text style={styles.barLabel}>{label}</Text>
        <Text style={styles.barValue}>{safeValue}</Text>
      </View>
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { backgroundColor: color, width: `${safeValue}%` }]} />
      </View>
    </View>
  )
}

function PrimaryAction({
  label,
  onPress,
  disabled = false,
}: {
  label: string
  onPress: () => void
  disabled?: boolean
}) {
  const { colors } = useTheme()
  const styles = createStyles(colors)
  return (
    <TouchableOpacity disabled={disabled} onPress={onPress} style={[styles.primary, disabled && styles.disabled]}>
      <Text style={styles.primaryText}>{label}</Text>
    </TouchableOpacity>
  )
}

function Empty({
  title,
  description,
  actionLabel,
  onAction,
}: {
  title: string
  description: string
  actionLabel?: string
  onAction?: () => void
}) {
  const { colors } = useTheme()
  const styles = createStyles(colors)
  return (
    <View style={styles.empty}>
      <View style={styles.largeAvatar}><Text style={styles.largeAvatarText}>◎</Text></View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyDescription}>{description}</Text>
      {actionLabel && onAction && <PrimaryAction label={actionLabel} onPress={onAction} />}
    </View>
  )
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  content: { padding: shared.pagePadding, paddingBottom: 48 },
  hero: { alignItems: 'center', flexDirection: 'row', gap: 14, marginBottom: 18, marginTop: 8 },
  avatar: { alignItems: 'center', backgroundColor: colors.nearBlack, borderRadius: 25, height: 50, justifyContent: 'center', width: 50 },
  avatarText: { color: '#fff', fontSize: 25 },
  heroText: { flex: 1 },
  eyebrow: { color: colors.gray500, fontSize: 8, fontWeight: '800', letterSpacing: 1.3 },
  title: { color: colors.ink, fontSize: 26, fontWeight: '800', letterSpacing: -0.8, marginVertical: 4 },
  muted: { color: colors.gray500, fontSize: 10, lineHeight: 16 },
  progressTrack: { backgroundColor: colors.gray200, borderRadius: 5, height: 7, overflow: 'hidden' },
  progressFill: { backgroundColor: colors.ink, height: 7 },
  progressLabels: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 23, marginTop: 7 },
  small: { color: colors.gray500, fontSize: 8, fontWeight: '800' },
  sectionTitle: { color: colors.ink, fontSize: 12, fontWeight: '800', marginBottom: 9 },
  attributes: { flexDirection: 'row', gap: 6, marginBottom: 10 },
  attribute: { alignItems: 'center', backgroundColor: colors.card, borderColor: colors.gray200, borderRadius: 15, borderWidth: 1, flex: 1, paddingVertical: 12 },
  attributeValue: { color: colors.ink, fontSize: 17, fontWeight: '800' },
  attributeLabel: { color: colors.gray500, fontSize: 7, marginTop: 4 },
  statusCard: { backgroundColor: colors.card, borderColor: colors.gray200, borderRadius: 20, borderWidth: 1, gap: 12, marginBottom: 11, padding: 15 },
  barRow: { gap: 5 },
  barLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  barLabel: { color: colors.ink, fontSize: 9, fontWeight: '700' },
  barValue: { color: colors.gray500, fontSize: 9, fontWeight: '700' },
  barTrack: { backgroundColor: colors.gray100, borderRadius: 4, height: 6, overflow: 'hidden' },
  barFill: { borderRadius: 4, height: 6 },
  dayCard: { backgroundColor: colors.card, borderColor: colors.gray200, borderRadius: 22, borderWidth: 1, marginBottom: 10, padding: 17 },
  dayTitle: { color: colors.ink, fontSize: 19, fontWeight: '800', marginBottom: 5, marginTop: 7 },
  primary: { alignItems: 'center', backgroundColor: colors.primary, borderRadius: 15, justifyContent: 'center', marginTop: 15, minHeight: 51, paddingHorizontal: 16 },
  primaryText: { color: colors.onPrimary, fontSize: 11, fontWeight: '800' },
  disabled: { opacity: 0.45 },
  actions: { gap: 8, marginTop: 14 },
  activity: { alignItems: 'center', backgroundColor: colors.surface, borderRadius: 15, flexDirection: 'row', gap: 10, minHeight: 60, padding: 12 },
  activityName: { color: colors.ink, fontSize: 11, fontWeight: '800', marginBottom: 3 },
  arrow: { color: colors.gray500, fontSize: 9, fontWeight: '700' },
  secondaryAction: { alignItems: 'center', borderColor: colors.gray200, borderRadius: 15, borderWidth: 1, justifyContent: 'center', minHeight: 48 },
  secondaryText: { color: colors.ink, fontSize: 10, fontWeight: '800' },
  pending: { backgroundColor: colors.surface, borderRadius: 16, marginTop: 14, padding: 14 },
  pendingLabel: { color: colors.gray500, fontSize: 8, fontWeight: '800' },
  pendingTitle: { color: colors.ink, fontSize: 14, fontWeight: '800', marginBottom: 4, marginTop: 7 },
  final: { marginTop: 13 },
  finalTitle: { color: colors.ink, fontSize: 15, fontWeight: '800', marginBottom: 5 },
  resultCard: { backgroundColor: colors.nearBlack, borderRadius: 20, marginBottom: 10, padding: 16 },
  resultTitle: { color: '#fff', fontSize: 13, fontWeight: '800', marginBottom: 6, marginTop: 7 },
  resultText: { color: '#bdbdbd', fontSize: 9, lineHeight: 15 },
  history: { alignItems: 'center', backgroundColor: colors.card, borderColor: colors.gray200, borderRadius: 16, borderWidth: 1, flexDirection: 'row', justifyContent: 'space-between', minHeight: 54, paddingHorizontal: 15 },
  historyText: { color: colors.ink, fontSize: 10, fontWeight: '800' },
  abandon: { color: colors.danger, fontSize: 10, fontWeight: '700', padding: 18, textAlign: 'center' },
  empty: { alignItems: 'center', flex: 1, justifyContent: 'center', padding: 28 },
  largeAvatar: { alignItems: 'center', backgroundColor: colors.nearBlack, borderRadius: 38, height: 76, justifyContent: 'center', marginBottom: 19, width: 76 },
  largeAvatarText: { color: '#fff', fontSize: 37 },
  emptyTitle: { color: colors.ink, fontSize: 25, fontWeight: '800', marginBottom: 8 },
  emptyDescription: { color: colors.gray500, fontSize: 11, lineHeight: 18, maxWidth: 300, textAlign: 'center' },
})
