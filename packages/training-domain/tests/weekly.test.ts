import { describe, expect, it } from 'vitest'
import {
  WEEKDAYS,
  buildWeeklyTrainingOverview,
  calculateHistoryProgress,
  createTrainingPlan,
  findLatestExerciseLoadReferences,
  type ExerciseDefinition,
  type TrainingDayExercise,
  type TrainingPlan,
  type WorkoutSession,
} from '..'

describe('visão semanal', () => {
  it('usa segunda a domingo local, inclusive em viradas, sem alterar entradas', () => {
    const plan = configuredPlan()
    const original = structuredClone(plan)
    const overview = buildWeeklyTrainingOverview(
      plan,
      [],
      null,
      new Date(2027, 0, 1, 12),
    )
    expect(overview.weekStartDateKey).toBe('2026-12-28')
    expect(overview.weekEndDateKey).toBe('2027-01-03')
    expect(overview.days).toHaveLength(7)
    expect(new Set(overview.days.map((day) => day.dateKey)).size).toBe(7)
    expect(overview.days.map((day) => day.weekday)).toEqual(WEEKDAYS)
    expect(plan).toEqual(original)
  })

  it('resolve todos os estados na prioridade definida e descanso passado não vira falta', () => {
    const plan = configuredPlan()
    plan.days[1]!.restDay = true
    const now = new Date(2026, 6, 30, 12)
    const sessions = [
      session('COMPLETED', plan, 0, '2026-07-27', 1),
      session('ABANDONED', plan, 0, '2026-07-27', 2),
      session('ABANDONED', plan, 6, '2026-08-02', 3),
      session('COMPLETED', { ...plan, id: 99 }, 3, '2026-07-30', 4),
      session('COMPLETED', plan, 4, '2026-07-31', 5),
    ]
    const active = session('PAUSED', plan, 3, '2026-07-30', 6)
    const overview = buildWeeklyTrainingOverview(plan, sessions, active, now)
    expect(overview.days.map((day) => day.status)).toEqual([
      'COMPLETED', 'REST', 'MISSED', 'PAUSED', 'COMPLETED', 'SCHEDULED', 'ABANDONED',
    ])
    expect(overview.completedTrainingDays).toBe(2)
    expect(overview.abandonedTrainingDays).toBe(1)
    expect(overview.plannedTrainingDays).toBe(6)
    expect(overview.progressPercent).toBe(33)
    expect(buildWeeklyTrainingOverview(plan, sessions, {
      ...active, status: 'IN_PROGRESS',
    }, now).today.status).toBe('ACTIVE')
    expect(buildWeeklyTrainingOverview(plan, [], null, now).today.status).toBe('READY')
    expect(buildWeeklyTrainingOverview(
      { ...plan, days: plan.days.filter((day) => day.weekday !== 'THURSDAY') },
      [],
      null,
      now,
    ).today.status).toBe('UNCONFIGURED')
  })

  it('filtra sessão por ficha, dia e data e calcula zero sem dias planejados', () => {
    const plan = configuredPlan()
    const wrongDate = session('COMPLETED', plan, 3, '2026-07-29', 1)
    expect(buildWeeklyTrainingOverview(plan, [wrongDate], null, new Date(2026, 6, 30, 12)).today.status)
      .toBe('READY')
    for (const day of plan.days) day.restDay = true
    const overview = buildWeeklyTrainingOverview(plan, [], null, new Date(2026, 6, 30, 12))
    expect(overview.plannedTrainingDays).toBe(0)
    expect(overview.progressPercent).toBe(0)
  })

  it('preserva status histórico em descanso sem ultrapassar o progresso planejado', () => {
    const plan = configuredPlan()
    for (const day of plan.days) day.restDay = true
    plan.days[0]!.restDay = false
    const sessions = [
      session('COMPLETED', plan, 0, '2026-07-27', 1),
      session('COMPLETED', plan, 1, '2026-07-28', 2),
      session('ABANDONED', plan, 2, '2026-07-29', 3),
    ]
    const before = structuredClone([plan, sessions])
    const overview = buildWeeklyTrainingOverview(
      plan,
      sessions,
      null,
      new Date(2026, 6, 30, 12),
    )
    expect(overview.days[1]!.status).toBe('COMPLETED')
    expect(overview.days[2]!.status).toBe('ABANDONED')
    expect(overview.plannedTrainingDays).toBe(1)
    expect(overview.completedTrainingDays).toBe(1)
    expect(overview.abandonedTrainingDays).toBe(0)
    expect(overview.completedTrainingDays).toBeLessThanOrEqual(overview.plannedTrainingDays)
    expect(overview.progressPercent).toBe(100)
    expect(overview.progressPercent).toBeLessThanOrEqual(100)
    expect([plan, sessions]).toEqual(before)
  })
})

describe('referências de carga', () => {
  it('busca a última carga válida concluída por exercício, limita três e preserva entradas', () => {
    const plan = configuredPlan()
    const day = plan.days[0]!
    day.exercises = [1, 2, 3, 4].map((id) => plannedExercise(id))
    const older = session('COMPLETED', plan, 0, '2026-07-20', 1)
    older.exercises = day.exercises.map((exercise) =>
      sessionExercise(exercise.exercise.id, [10, 12]))
    const latest = session('COMPLETED', plan, 0, '2026-07-27', 2)
    latest.exercises = day.exercises.map((exercise, index) =>
      sessionExercise(exercise.exercise.id, index === 0 ? [0, 20] : [30]))
    latest.exercises[1]!.sets[0]!.completed = false
    const ignored = [
      { ...latest, id: 3, status: 'ABANDONED' as const },
      { ...latest, id: 4, planDayId: 999 },
      { ...latest, id: 5, trainingPlanId: 999 },
    ]
    const before = structuredClone([day, older, latest, ignored])
    expect(findLatestExerciseLoadReferences(plan.id, day, [older, ...ignored, latest])).toEqual([
      expect.objectContaining({ exerciseDefinitionId: 1, load: 20, sessionId: 2 }),
      expect.objectContaining({ exerciseDefinitionId: 2, load: 12, sessionId: 1 }),
      expect.objectContaining({ exerciseDefinitionId: 3, load: 30, sessionId: 2 }),
    ])
    expect([day, older, latest, ignored]).toEqual(before)
  })
})

describe('progresso histórico', () => {
  it('calcula conclusão, semana local, exercícios, duração e volume', () => {
    const plan = configuredPlan()
    const completed = session('COMPLETED', plan, 0, '2026-07-27', 1)
    completed.totalDurationSeconds = 600
    completed.totalVolume = 125
    completed.exercises = [sessionExercise(1, [10], 'COMPLETED')]
    const sessions = [
      completed,
      session('ABANDONED', plan, 1, '2026-07-28', 2),
      session('IN_PROGRESS', plan, 2, '2026-07-29', 3),
      session('PAUSED', plan, 3, '2026-07-30', 4),
    ]
    expect(calculateHistoryProgress(sessions, new Date(2026, 6, 30, 12))).toEqual({
      completedSessions: 1,
      completedThisWeek: 1,
      completionRate: 50,
      completedExercises: 1,
      totalDurationSeconds: 600,
      totalVolume: 125,
    })
    expect(calculateHistoryProgress([])).toEqual({
      completedSessions: 0,
      completedThisWeek: 0,
      completionRate: 0,
      completedExercises: 0,
      totalDurationSeconds: 0,
      totalVolume: 0,
    })
  })
})

function configuredPlan(): TrainingPlan {
  let id = 1
  const plan = createTrainingPlan({
    name: 'Semana local',
    description: '',
    category: 'Força',
    difficulty: 'Intermediário',
  }, 1, () => ++id, new Date(2026, 6, 27, 12))
  plan.active = true
  for (const day of plan.days) {
    day.restDay = false
    day.exercises = [plannedExercise(day.id)]
  }
  return plan
}

function plannedExercise(id: number): TrainingDayExercise {
  return {
    id,
    exercise: exercise(id),
    sortOrder: 0,
    sets: 3,
    minReps: 8,
    maxReps: 12,
    plannedLoad: null,
    plannedDurationSeconds: null,
    plannedDistance: null,
    restSeconds: 60,
    plannedRpe: null,
    setType: 'NORMAL',
    notes: '',
    alternativeExerciseId: null,
  }
}

function exercise(id: number): ExerciseDefinition {
  return {
    id,
    name: `Exercício ${id}`,
    normalizedName: `exercicio ${id}`,
    description: '',
    primaryMuscleGroup: 'Geral',
    secondaryMuscleGroups: [],
    equipment: 'Livre',
    category: 'STRENGTH',
    difficulty: 'Intermediário',
    instructions: '',
    notes: '',
    unilateral: false,
    timed: false,
    source: 'CUSTOM',
    externalId: null,
    sourceUrl: null,
    licenseName: null,
    licenseUrl: null,
    author: null,
    archived: false,
    createdAt: '',
    updatedAt: '',
    media: [],
    primaryVideo: null,
    primaryImage: null,
    hasVideo: false,
    primaryVideoUrl: null,
    primaryImageUrl: null,
    custom: true,
    mediaUrl: '',
  }
}

function session(
  status: WorkoutSession['status'],
  plan: TrainingPlan,
  dayIndex: number,
  scheduledDate: string,
  id: number,
): WorkoutSession {
  const day = plan.days[dayIndex]!
  return {
    id,
    trainingPlanId: plan.id,
    planDayId: day.id,
    workoutName: plan.name,
    dayName: day.title,
    scheduledDate,
    startedAt: `${scheduledDate}T12:00:00.000Z`,
    completedAt: status === 'COMPLETED' || status === 'ABANDONED'
      ? `${scheduledDate}T13:00:00.000Z`
      : null,
    pausedAt: status === 'PAUSED' ? `${scheduledDate}T12:30:00.000Z` : null,
    pausedDurationSeconds: 0,
    status,
    totalDurationSeconds: 0,
    overallRpe: null,
    notes: '',
    completedSets: 0,
    totalPlannedSets: 0,
    totalVolume: 0,
    exercises: [],
  }
}

function sessionExercise(
  exerciseDefinitionId: number,
  loads: number[],
  status: 'COMPLETED' | 'PENDING' = 'COMPLETED',
): WorkoutSession['exercises'][number] {
  return {
    id: exerciseDefinitionId,
    exerciseDefinitionId,
    name: `Exercício ${exerciseDefinitionId}`,
    muscleGroup: 'Geral',
    category: 'STRENGTH',
    timed: false,
    primaryVideoUrl: null,
    primaryImageUrl: null,
    primaryVideoSourceUrl: null,
    primaryVideoLicenseName: null,
    primaryVideoLicenseUrl: null,
    primaryVideoAuthor: null,
    attribution: null,
    sortOrder: 0,
    plannedSets: loads.length,
    plannedMinReps: 8,
    plannedMaxReps: 12,
    plannedLoad: null,
    plannedDurationSeconds: null,
    plannedDistance: null,
    restSeconds: 60,
    setType: 'NORMAL',
    status,
    notes: '',
    sets: loads.map((load, index) => ({
      id: index + 1,
      setNumber: index + 1,
      reps: 10,
      load,
      durationSeconds: 0,
      distance: 0,
      rpe: null,
      completed: load >= 0,
      completedAt: '',
      manuallyAdded: false,
      notes: '',
      volume: load * 10,
    })),
  }
}
