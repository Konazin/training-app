import type { Weekday } from '../../training-plan/model/trainingPlan'
import type { WorkoutSession } from '../../workout-session/model/workoutSession'

export type CareerStatus = 'ACTIVE' | 'COMPLETED' | 'ABANDONED'
export type TurnActionType = 'TRAINING' | 'REST_ACTIVITY' | 'FULL_REST'
export type TurnStatus = 'IN_PROGRESS' | 'COMPLETED' | 'ABANDONED'

export interface UmaEffects {
  strengthDelta: number
  enduranceDelta: number
  agilityDelta: number
  techniqueDelta: number
  disciplineDelta: number
  energyDelta: number
  fatigueDelta: number
  moodDelta: number
  confidenceDelta: number
}

export interface UmaTurn {
  id: number
  weekNumber: number
  weekday: Weekday
  actionType: TurnActionType
  status: TurnStatus
  trainingPlanDayId: number | null
  workoutSessionId: number | null
  restActivityId: number | null
  actionTitle: string
  activityCategory: string | null
  activityDurationMinutes: number | null
  resultText: string
  effects: UmaEffects
  createdAt: string
  completedAt: string | null
}

export interface UmaCareer {
  id: number
  name: string
  status: CareerStatus
  totalWeeks: number
  currentWeek: number
  currentWeekday: Weekday
  strength: number
  endurance: number
  agility: number
  technique: number
  discipline: number
  energy: number
  fatigue: number
  mood: number
  confidence: number
  createdAt: string
  updatedAt: string
  completedAt: string | null
  version: number
  progressPercentage: number
  trainingPlan: { id: number; name: string }
  currentDay: {
    id: number
    weekday: Weekday
    title: string
    restDay: boolean
    exerciseCount: number
    estimatedDurationMinutes: number
    restActivities: Array<{
      id: number
      name: string
      category: string
      estimatedDurationMinutes: number
    }>
  }
  pendingTurn: UmaTurn | null
  lastResults: UmaTurn[]
}

export interface CreateUmaCareerInput {
  name: string
  trainingPlanId: number
  totalWeeks: 8 | 12 | 16
}

export interface StartUmaTrainingResult {
  career: UmaCareer
  session: WorkoutSession
}

const WEEKDAYS: Weekday[] = [
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
  'SUNDAY',
]

const WEEKDAY_LABELS: Record<Weekday, string> = {
  MONDAY: 'Segunda-feira',
  TUESDAY: 'Terça-feira',
  WEDNESDAY: 'Quarta-feira',
  THURSDAY: 'Quinta-feira',
  FRIDAY: 'Sexta-feira',
  SATURDAY: 'Sábado',
  SUNDAY: 'Domingo',
}

export function careerProgress(
  currentWeek: number,
  weekday: Weekday,
  totalWeeks: number,
  status: CareerStatus,
) {
  if (status === 'COMPLETED') return 100
  const completedDays = (currentWeek - 1) * 7 + WEEKDAYS.indexOf(weekday)
  return visualClamp(completedDays / (totalWeeks * 7) * 100)
}

export function formatCareerPeriod(currentWeek: number, totalWeeks: number, weekday: Weekday) {
  return `Semana ${currentWeek} de ${totalWeeks} · ${WEEKDAY_LABELS[weekday]}`
}

export function formatWeekday(weekday: Weekday) {
  return WEEKDAY_LABELS[weekday]
}

export function visualClamp(value: number, maximum = 100) {
  return Math.max(0, Math.min(maximum, value))
}

export function availableCareerAction(career: UmaCareer) {
  if (career.status !== 'ACTIVE') return 'FINISHED' as const
  if (career.pendingTurn?.actionType === 'TRAINING') return 'CONTINUE_TRAINING' as const
  if (career.pendingTurn?.actionType === 'REST_ACTIVITY') return 'COMPLETE_REST_ACTIVITY' as const
  return career.currentDay.restDay ? 'CHOOSE_REST' as const : 'START_TRAINING' as const
}
