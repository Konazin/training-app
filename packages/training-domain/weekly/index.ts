import {
  WEEKDAYS,
  type TrainingPlan,
  type TrainingPlanDay,
  type Weekday,
  type WorkoutSession,
} from '../model'
import { localDateKey } from '../rules'

export type WeeklyTrainingDayStatus =
  | 'COMPLETED'
  | 'ACTIVE'
  | 'PAUSED'
  | 'READY'
  | 'SCHEDULED'
  | 'REST'
  | 'MISSED'
  | 'ABANDONED'
  | 'UNCONFIGURED'

export interface WeeklyTrainingDayOverview {
  dateKey: string
  weekday: Weekday
  planDayId: number | null
  title: string
  description: string
  restDay: boolean
  exerciseCount: number
  restActivityCount: number
  plannedSets: number
  estimatedDurationMinutes: number
  status: WeeklyTrainingDayStatus
  isToday: boolean
  isPast: boolean
  isFuture: boolean
  sessionId: number | null
}

export interface WeeklyTrainingOverview {
  planId: number
  planName: string
  weekStartDateKey: string
  weekEndDateKey: string
  todayDateKey: string
  days: WeeklyTrainingDayOverview[]
  plannedTrainingDays: number
  completedTrainingDays: number
  abandonedTrainingDays: number
  progressPercent: number
  today: WeeklyTrainingDayOverview
}

export interface ExerciseLoadReference {
  exerciseDefinitionId: number
  exerciseName: string
  load: number
  sessionId: number
  scheduledDate: string
}

export function buildWeeklyTrainingOverview(
  plan: TrainingPlan,
  sessions: readonly WorkoutSession[],
  activeSession: WorkoutSession | null,
  now = new Date(),
): WeeklyTrainingOverview {
  const todayDateKey = localDateKey(now)
  const weekStart = startOfLocalWeek(now)
  const days = WEEKDAYS.map((weekday, index) => {
    const date = addLocalDays(weekStart, index)
    const dateKey = localDateKey(date)
    const planDay = plan.days.find((day) => day.weekday === weekday)
    return buildDay(plan, planDay, weekday, dateKey, todayDateKey, sessions, activeSession)
  })
  const plannedTrainingDays = days.filter((day) => !day.restDay && day.planDayId !== null).length
  const completedTrainingDays = days.filter((day) => day.status === 'COMPLETED').length
  const abandonedTrainingDays = days.filter((day) => day.status === 'ABANDONED').length
  return {
    planId: plan.id,
    planName: plan.name,
    weekStartDateKey: days[0]!.dateKey,
    weekEndDateKey: days[6]!.dateKey,
    todayDateKey,
    days,
    plannedTrainingDays,
    completedTrainingDays,
    abandonedTrainingDays,
    progressPercent: plannedTrainingDays
      ? Math.round(completedTrainingDays / plannedTrainingDays * 100)
      : 0,
    today: days.find((day) => day.isToday)!,
  }
}

export function findLatestExerciseLoadReferences(
  day: TrainingPlanDay,
  sessions: readonly WorkoutSession[],
  limit = 3,
): ExerciseLoadReference[] {
  if (limit <= 0) return []
  const completed = [...sessions]
    .filter((session) => session.status === 'COMPLETED' && session.planDayId === day.id)
    .sort((first, second) =>
      `${second.scheduledDate}|${second.completedAt ?? second.startedAt}`
        .localeCompare(`${first.scheduledDate}|${first.completedAt ?? first.startedAt}`))
  return day.exercises.flatMap((planned) => {
    for (const session of completed) {
      const exercise = session.exercises.find(
        (item) => item.exerciseDefinitionId === planned.exercise.id,
      )
      const set = exercise?.sets.slice().reverse().find((item) => item.completed && item.load > 0)
      if (set) {
        return [{
          exerciseDefinitionId: planned.exercise.id,
          exerciseName: planned.exercise.name,
          load: set.load,
          sessionId: session.id,
          scheduledDate: session.scheduledDate,
        }]
      }
    }
    return []
  }).slice(0, limit)
}

function buildDay(
  plan: TrainingPlan,
  day: TrainingPlanDay | undefined,
  weekday: Weekday,
  dateKey: string,
  todayDateKey: string,
  sessions: readonly WorkoutSession[],
  activeSession: WorkoutSession | null,
): WeeklyTrainingDayOverview {
  const matching = day
    ? sessions.filter((session) =>
        session.trainingPlanId === plan.id
        && session.planDayId === day.id
        && session.scheduledDate === dateKey)
    : []
  const completed = matching.find((session) => session.status === 'COMPLETED')
  const abandoned = matching.find((session) => session.status === 'ABANDONED')
  const current = day
    && activeSession?.trainingPlanId === plan.id
    && activeSession.planDayId === day.id
    && (activeSession.status === 'IN_PROGRESS' || activeSession.status === 'PAUSED')
    ? activeSession
    : null
  const isToday = dateKey === todayDateKey
  const isPast = dateKey < todayDateKey
  const isFuture = dateKey > todayDateKey
  const status: WeeklyTrainingDayStatus = current?.status === 'IN_PROGRESS'
    ? 'ACTIVE'
    : current?.status === 'PAUSED'
      ? 'PAUSED'
      : completed
        ? 'COMPLETED'
        : abandoned
          ? 'ABANDONED'
          : day?.restDay
            ? 'REST'
            : day && isToday
              ? 'READY'
              : day && isPast
                ? 'MISSED'
                : day && isFuture
                  ? 'SCHEDULED'
                  : 'UNCONFIGURED'
  return {
    dateKey,
    weekday,
    planDayId: day?.id ?? null,
    title: day?.title ?? 'Dia não configurado',
    description: day?.description ?? '',
    restDay: day?.restDay ?? false,
    exerciseCount: day?.exercises.length ?? 0,
    restActivityCount: day?.restActivities.length ?? 0,
    plannedSets: day?.exercises.reduce((total, exercise) => total + exercise.sets, 0) ?? 0,
    estimatedDurationMinutes: day?.estimatedDurationMinutes ?? 0,
    status,
    isToday,
    isPast,
    isFuture,
    sessionId: current?.id ?? completed?.id ?? abandoned?.id ?? null,
  }
}

function startOfLocalWeek(date: Date) {
  const result = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  result.setDate(result.getDate() - ((result.getDay() + 6) % 7))
  return result
}

function addLocalDays(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + amount)
}
