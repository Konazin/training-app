import type {
  Dashboard,
  ExerciseDefinition,
  SessionExercise,
  TrainingDayExercise,
  TrainingPlan,
  TrainingPlanDay,
  TrainingPlanInput,
  WorkoutSession,
} from '../model'
import { WEEKDAYS } from '../model'
import { invalidTransition, notFound } from '../errors'
import { historyStats, selectPrimaryMedia, sessionDuration, validatePlan } from '../rules'

export function newTrainingWeek(makeId: () => number): TrainingPlanDay[] {
  return WEEKDAYS.map((weekday, sortOrder) => ({
    id: makeId(),
    weekday,
    title: weekdayLabel(weekday),
    description: '',
    sortOrder,
    restDay: sortOrder === 6,
    estimatedDurationMinutes: 0,
    notes: '',
    exercises: [],
    restActivities: [],
  }))
}

export function createTrainingPlan(input: TrainingPlanInput, id: number, makeDayId: () => number, now = new Date()): TrainingPlan {
  const timestamp = now.toISOString()
  return validatePlan({
    id,
    name: input.name.trim(),
    description: input.description.trim(),
    category: input.category.trim(),
    difficulty: input.difficulty.trim(),
    startDate: input.startDate ?? null,
    endDate: input.endDate ?? null,
    active: false,
    archived: false,
    days: newTrainingWeek(makeDayId),
    createdAt: timestamp,
    updatedAt: timestamp,
  })
}

export function duplicateTrainingPlan(
  source: TrainingPlan,
  planId: number,
  makeDayId: () => number,
  makeExerciseId: () => number,
  makeActivityId: () => number,
  now = new Date(),
) {
  const timestamp = now.toISOString()
  return validatePlan({
    ...source,
    id: planId,
    name: `${source.name} (cópia)`,
    active: false,
    archived: false,
    createdAt: timestamp,
    updatedAt: timestamp,
    days: source.days.map((day) => ({
      ...day,
      id: makeDayId(),
      exercises: day.exercises.map((exercise) => ({ ...exercise, id: makeExerciseId() })),
      restActivities: day.restActivities.map((activity) => ({ ...activity, id: makeActivityId() })),
    })),
  })
}

export function snapshotExercise(source: TrainingDayExercise, id: number, makeSetId: () => number, now = new Date()): SessionExercise {
  const video = selectPrimaryMedia(source.exercise.media, 'VIDEO')
  const image = selectPrimaryMedia(source.exercise.media, 'IMAGE')
  return {
    id,
    exerciseDefinitionId: source.exercise.id,
    name: source.exercise.name,
    muscleGroup: source.exercise.primaryMuscleGroup,
    category: source.exercise.category,
    timed: source.exercise.timed,
    primaryVideoUrl: video?.localUri ?? video?.remoteUrl ?? null,
    primaryImageUrl: image?.localUri ?? image?.remoteUrl ?? null,
    primaryVideoSourceUrl: video?.sourceUrl ?? null,
    primaryVideoLicenseName: video?.licenseName ?? null,
    primaryVideoLicenseUrl: video?.licenseUrl ?? null,
    primaryVideoAuthor: video?.author ?? null,
    attribution: [video?.author, video?.licenseName].filter(Boolean).join(' · ') || null,
    sortOrder: source.sortOrder,
    plannedSets: source.sets,
    plannedMinReps: source.minReps,
    plannedMaxReps: source.maxReps,
    plannedLoad: source.plannedLoad,
    plannedDurationSeconds: source.plannedDurationSeconds,
    plannedDistance: source.plannedDistance,
    restSeconds: source.restSeconds,
    setType: source.setType,
    status: 'PENDING',
    notes: source.notes,
    sets: Array.from({ length: source.sets }, (_, index) => ({
      id: makeSetId(),
      setNumber: index + 1,
      reps: source.minReps,
      load: source.plannedLoad ?? 0,
      durationSeconds: source.plannedDurationSeconds ?? 0,
      distance: source.plannedDistance ?? 0,
      rpe: source.plannedRpe,
      completed: false,
      completedAt: null,
      manuallyAdded: false,
      notes: '',
      volume: 0,
    })),
  }
}

export function createSessionSnapshot(
  plan: TrainingPlan,
  day: TrainingPlanDay,
  sessionId: number,
  makeExerciseId: () => number,
  makeSetId: () => number,
  now = new Date(),
): WorkoutSession {
  const timestamp = now.toISOString()
  const exercises = day.exercises.map((exercise) => snapshotExercise(exercise, makeExerciseId(), makeSetId, now))
  return {
    id: sessionId,
    trainingPlanId: plan.id,
    planDayId: day.id,
    workoutName: plan.name,
    dayName: day.title,
    scheduledDate: timestamp.slice(0, 10),
    startedAt: timestamp,
    completedAt: null,
    pausedAt: null,
    pausedDurationSeconds: 0,
    status: 'IN_PROGRESS',
    totalDurationSeconds: 0,
    overallRpe: null,
    notes: '',
    completedSets: 0,
    totalPlannedSets: exercises.reduce((sum, exercise) => sum + exercise.plannedSets, 0),
    totalVolume: 0,
    exercises,
  }
}

export function calculateDashboard(sessions: WorkoutSession[], activePlan: TrainingPlan | null, now = new Date()): Dashboard {
  const stats = historyStats(sessions, now)
  const next = activePlan?.days.find((day) => day.weekday === weekdayFrom(now)) ?? null
  return {
    ...stats,
    activePlanName: activePlan?.name ?? null,
    nextWorkoutName: next?.title ?? null,
    nextPlanDayId: next?.id ?? null,
    adherence: sessions.length ? Math.round(stats.completedSessions / sessions.length * 100) : 0,
    recentSessions: sessions.slice(0, 5),
  }
}

export function activateTrainingPlan(plans: TrainingPlan[], id: number, now = new Date()) {
  const selected = plans.find((plan) => plan.id === id && !plan.archived)
  if (!selected) throw notFound('Ficha')
  return plans.map((plan) => ({
    ...plan,
    active: plan.id === id,
    updatedAt: plan.id === id ? now.toISOString() : plan.updatedAt,
  }))
}

export function archiveTrainingPlan(plan: TrainingPlan, archived = true, now = new Date()) {
  return {
    ...plan,
    archived,
    active: archived ? false : plan.active,
    updatedAt: now.toISOString(),
  }
}

export function pauseWorkoutSession(session: WorkoutSession, now = new Date()) {
  if (session.status !== 'IN_PROGRESS') throw invalidTransition()
  return { ...session, status: 'PAUSED' as const, pausedAt: now.toISOString() }
}

export function resumeWorkoutSession(session: WorkoutSession, now = new Date()) {
  if (session.status !== 'PAUSED' || !session.pausedAt) throw invalidTransition()
  const paused = Math.max(0, Math.floor((now.getTime() - new Date(session.pausedAt).getTime()) / 1000))
  return {
    ...session,
    status: 'IN_PROGRESS' as const,
    pausedAt: null,
    pausedDurationSeconds: session.pausedDurationSeconds + paused,
  }
}

export function finishWorkoutSession(
  session: WorkoutSession,
  status: 'COMPLETED' | 'ABANDONED',
  overallRpe: number | null,
  notes: string,
  now = new Date(),
) {
  if (!['IN_PROGRESS', 'PAUSED'].includes(session.status)) throw invalidTransition()
  const pausedDurationSeconds = session.status === 'PAUSED' && session.pausedAt
    ? session.pausedDurationSeconds
      + Math.max(0, Math.floor((now.getTime() - new Date(session.pausedAt).getTime()) / 1000))
    : session.pausedDurationSeconds
  const finished = {
    ...session,
    status,
    completedAt: now.toISOString(),
    pausedAt: null,
    pausedDurationSeconds,
    overallRpe,
    notes: notes.trim(),
  }
  return { ...finished, totalDurationSeconds: sessionDuration(finished, now) }
}

function weekdayFrom(date: Date) {
  return WEEKDAYS[(date.getDay() + 6) % 7]!
}

function weekdayLabel(weekday: typeof WEEKDAYS[number]) {
  return {
    MONDAY: 'Segunda-feira',
    TUESDAY: 'Terça-feira',
    WEDNESDAY: 'Quarta-feira',
    THURSDAY: 'Quinta-feira',
    FRIDAY: 'Sexta-feira',
    SATURDAY: 'Sábado',
    SUNDAY: 'Domingo',
  }[weekday]
}
