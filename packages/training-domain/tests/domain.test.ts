import { describe, expect, it } from 'vitest'
import {
  WEEKDAYS,
  applyMedia,
  activateTrainingPlan,
  archiveTrainingPlan,
  calculateDashboard,
  computeTrainingPlanPurgeAt,
  createSessionSnapshot,
  createTrainingPlan,
  duplicateTrainingPlan,
  finishWorkoutSession,
  historyStats,
  localDateKey,
  normalizeName,
  pauseWorkoutSession,
  reorder,
  resumeWorkoutSession,
  sessionDuration,
  sessionVolume,
  trainingPlanTrashDaysRemaining,
  trainingPlanTrashStatusLabel,
  validateDayExerciseInput,
  validateRestActivityInput,
  validateSetLogInput,
  validateTrainingPlanDayInput,
  validateTrainingPlanInput,
  validateTrainingPlanLifecycle,
  validatePlan,
  type ExerciseDefinition,
  type TrainingDayExercise,
  type WorkoutSession,
} from '..'

const now = new Date('2026-07-29T12:00:00.000Z')
let id = 1
const nextId = () => id++

describe('training-domain', () => {
  it('normaliza nomes, cria sete dias e duplica sem compartilhar IDs', () => {
    id = 1
    expect(normalizeName('  Elevação   PÉLVICA ')).toBe('elevacao pelvica')
    const plan = createTrainingPlan({
      name: 'Calistenia', description: '', category: 'Força', difficulty: 'Iniciante',
    }, nextId(), nextId, now)
    expect(plan.days.map((day) => day.weekday)).toEqual(WEEKDAYS)
    expect(() => validatePlan({ ...plan, days: plan.days.slice(0, 6) })).toThrow('segunda a domingo')
    const copy = duplicateTrainingPlan(plan, nextId(), nextId, nextId, nextId, now)
    expect(copy.name).toBe('Calistenia (cópia)')
    expect(copy.days[0]?.id).not.toBe(plan.days[0]?.id)
  })

  it('ordena com validação e seleciona mídia local principal', () => {
    const base = [{ id: 1, sortOrder: 0 }, { id: 2, sortOrder: 1 }]
    expect(reorder(base, [2, 1]).map((item) => item.id)).toEqual([2, 1])
    expect(() => reorder(base, [1, 1])).toThrow('ordem')
    const exercise = applyMedia({
      ...exerciseDefinition(),
      media: [{
        id: 1, exerciseDefinitionId: 1, type: 'VIDEO', source: 'SYSTEM', externalId: null,
        remoteUrl: 'https://example.test/video.mp4', localUri: 'file:///video.mp4',
        thumbnailRemoteUrl: null, thumbnailLocalUri: null, mimeType: 'video/mp4',
        width: null, height: null, durationSeconds: 10, main: true, sortOrder: 0,
        licenseName: null, licenseUrl: null, author: null, sourceUrl: null,
        downloadedAt: null, createdAt: now.toISOString(), updatedAt: now.toISOString(),
        url: 'file:///video.mp4', thumbnailUrl: null,
      }],
    })
    expect(exercise.primaryVideoUrl).toBe('file:///video.mp4')
  })

  it('cria snapshots imutáveis e calcula sessão e dashboard', () => {
    id = 20
    const plan = createTrainingPlan({
      name: 'Calistenia', description: '', category: 'Força', difficulty: 'Iniciante',
    }, 1, nextId, now)
    const configured: TrainingDayExercise = {
      id: 9, exercise: exerciseDefinition(), sortOrder: 0, sets: 2, minReps: 8, maxReps: 12,
      plannedLoad: 10, plannedDurationSeconds: null, plannedDistance: null, restSeconds: 60,
      plannedRpe: 7, setType: 'NORMAL', notes: '', alternativeExerciseId: null,
    }
    plan.days[0]!.exercises = [configured]
    const session = createSessionSnapshot(plan, plan.days[0]!, 1, nextId, nextId, now)
    configured.exercise.name = 'Nome editado'
    expect(session.exercises[0]?.name).toBe('Flexão')
    session.exercises[0]!.sets[0] = {
      ...session.exercises[0]!.sets[0]!, completed: true, reps: 10, load: 10, volume: 100,
    }
    session.status = 'COMPLETED'
    session.completedAt = '2026-07-29T12:10:00.000Z'
    session.totalDurationSeconds = sessionDuration(session, now)
    session.totalVolume = sessionVolume(session)
    session.completedSets = 1
    expect(session.totalDurationSeconds).toBe(600)
    expect(session.totalVolume).toBe(100)
    expect(historyStats([session], now).completedSessions).toBe(1)
    expect(calculateDashboard([session], plan, now).totalVolume).toBe(100)
  })

  it('ativa, arquiva, pausa, retoma, conclui e abandona com transições estáveis', () => {
    id = 200
    const first = createTrainingPlan({
      name: 'A', description: '', category: 'Força', difficulty: 'Inicial',
    }, 1, nextId, now)
    const second = createTrainingPlan({
      name: 'B', description: '', category: 'Força', difficulty: 'Inicial',
    }, 2, nextId, now)
    const active = activateTrainingPlan([first, second], 2, now)
    expect(active.map((plan) => plan.active)).toEqual([false, true])
    expect(archiveTrainingPlan(active[1]!, true, now)).toMatchObject({ archived: true, active: false })

    const session = {
      id: 1, trainingPlanId: 1, planDayId: 1, workoutName: 'A', dayName: 'Segunda',
      scheduledDate: '2026-07-29', startedAt: '2026-07-29T12:00:00.000Z',
      completedAt: null, pausedAt: null, pausedDurationSeconds: 0,
      status: 'IN_PROGRESS' as const, totalDurationSeconds: 0, overallRpe: null,
      notes: '', completedSets: 0, totalPlannedSets: 0, totalVolume: 0, exercises: [],
    }
    const paused = pauseWorkoutSession(session, new Date('2026-07-29T12:01:00.000Z'))
    const resumed = resumeWorkoutSession(paused, new Date('2026-07-29T12:02:00.000Z'))
    expect(resumed.pausedDurationSeconds).toBe(60)
    expect(finishWorkoutSession(resumed, 'COMPLETED', 8, 'ok', new Date('2026-07-29T12:05:00.000Z')))
      .toMatchObject({ status: 'COMPLETED', totalDurationSeconds: 240, overallRpe: 8 })
    expect(finishWorkoutSession(session, 'ABANDONED', null, '', new Date('2026-07-29T12:01:00.000Z')).status)
      .toBe('ABANDONED')
    expect(() => finishWorkoutSession(
      session,
      'COMPLETED',
      8,
      'a'.repeat(2_001),
      new Date('2026-07-29T12:01:00.000Z'),
    )).toThrow('2000')
    expect(() => pauseWorkoutSession(paused, now)).toThrow('Transição')
  })

  it('usa a data do calendário local com zeros e viradas de ano', () => {
    expect(localDateKey(new Date(2026, 6, 29, 22, 30))).toBe('2026-07-29')
    expect(localDateKey(new Date(2026, 11, 31, 23, 59))).toBe('2026-12-31')
    expect(localDateKey(new Date(2027, 0, 1, 0, 1))).toBe('2027-01-01')
    expect(localDateKey(new Date(2026, 0, 2, 8, 0))).toBe('2026-01-02')
  })

  it('centraliza validações de ficha, dia, exercício, descanso e série', () => {
    expect(() => validateTrainingPlanInput({
      name: '', description: '', category: 'Força', difficulty: 'Inicial',
    })).toThrow('nome')
    expect(() => validateTrainingPlanInput({
      name: 'A', description: '', category: 'Força', difficulty: 'Inicial',
      startDate: '2026-08-01', endDate: '2026-07-01',
    })).toThrow('data final')
    expect(() => validateTrainingPlanInput({
      name: 'A', description: '', category: 'Força', difficulty: 'Inicial',
      startDate: '2026-99-99',
    })).toThrow('datas válidas')
    expect(() => validateTrainingPlanDayInput({
      title: '', description: '', restDay: false, estimatedDurationMinutes: 0, notes: '',
    })).toThrow('título')
    expect(() => validateDayExerciseInput({
      sets: 0, minReps: 0, maxReps: 0, plannedLoad: null,
      plannedDurationSeconds: null, plannedDistance: null, restSeconds: 0,
      plannedRpe: null, setType: 'NORMAL', notes: '', alternativeExerciseId: null,
    })).toThrow('séries')
    expect(() => validateRestActivityInput({
      name: ' ', description: '', estimatedDurationMinutes: 0, category: 'Mobilidade', optional: false,
    })).toThrow('nome')
    expect(() => validateSetLogInput({
      reps: 1, load: 0, durationSeconds: 0, distance: 0, rpe: 11, completed: false, notes: '',
    })).toThrow('RPE')
    expect(() => validateSetLogInput({
      reps: 1, load: 0, durationSeconds: 0, distance: 0, rpe: 7,
      completed: false, notes: 'a'.repeat(501),
    })).toThrow('500')
  })

  it('calcula e valida o ciclo UTC da lixeira', () => {
    const deletedAt = '2026-07-29T12:00:00.000Z'
    const purgeAt = computeTrainingPlanPurgeAt(deletedAt)
    expect(purgeAt).toBe('2026-08-05T12:00:00.000Z')
    expect(trainingPlanTrashDaysRemaining(purgeAt, new Date('2026-08-01T12:01:00.000Z'))).toBe(4)
    expect(trainingPlanTrashStatusLabel(purgeAt, new Date('2026-08-04T11:59:00.000Z')))
      .toBe('Será apagada em 2 dias')
    expect(trainingPlanTrashStatusLabel(purgeAt, new Date('2026-08-04T12:00:00.000Z')))
      .toBe('Será apagada amanhã')
    expect(trainingPlanTrashStatusLabel(purgeAt, new Date('2026-08-05T11:59:00.000Z')))
      .toBe('Será apagada hoje')
    expect(trainingPlanTrashStatusLabel(purgeAt, new Date('2026-08-05T12:00:00.000Z')))
      .toBe('Pronta para exclusão')
    expect(() => validateTrainingPlanLifecycle({
      active: false, archived: false, deletedAt, purgeAt,
    })).not.toThrow()
    expect(() => validateTrainingPlanLifecycle({
      active: true, archived: false, deletedAt, purgeAt,
    })).toThrow('Ciclo de vida')
    expect(() => validateTrainingPlanLifecycle({
      active: false, archived: false, deletedAt, purgeAt: null,
    })).toThrow('Ciclo de vida')
    expect(() => validateTrainingPlanLifecycle({
      active: false, archived: false, deletedAt, purgeAt: deletedAt,
    })).toThrow('Ciclo de vida')
  })

  it('calcula duração ativa, pausada e rejeita relógios inválidos', () => {
    const session: WorkoutSession = {
      id: 1, trainingPlanId: 1, planDayId: 1, workoutName: 'A', dayName: 'Segunda',
      scheduledDate: '2026-07-29', startedAt: '2026-07-29T12:00:00.000Z',
      completedAt: null, pausedAt: null, pausedDurationSeconds: 0,
      status: 'IN_PROGRESS', totalDurationSeconds: 0, overallRpe: null, notes: '',
      completedSets: 0, totalPlannedSets: 0, totalVolume: 0, exercises: [],
    }
    const paused = pauseWorkoutSession(session, new Date('2026-07-29T12:02:00.000Z'))
    const completedPaused = finishWorkoutSession(
      paused, 'COMPLETED', null, '', new Date('2026-07-29T12:05:00.000Z'),
    )
    expect(completedPaused.totalDurationSeconds).toBe(120)
    const resumed = resumeWorkoutSession(paused, new Date('2026-07-29T12:03:00.000Z'))
    const pausedAgain = pauseWorkoutSession(resumed, new Date('2026-07-29T12:04:00.000Z'))
    expect(finishWorkoutSession(
      pausedAgain, 'COMPLETED', null, '', new Date('2026-07-29T12:05:00.000Z'),
    ).totalDurationSeconds).toBe(180)
    expect(() => sessionDuration(session, new Date('2026-07-29T11:59:00.000Z'))).toThrow('duração')
    expect(() => finishWorkoutSession(
      { ...paused, pausedAt: 'inválido' }, 'COMPLETED', null, '', new Date('2026-07-29T12:05:00.000Z'),
    )).toThrow('Transição')
  })
})

function exerciseDefinition(): ExerciseDefinition {
  return {
    id: 1, name: 'Flexão', normalizedName: 'flexao', description: '', primaryMuscleGroup: 'Peitoral',
    secondaryMuscleGroups: ['Tríceps'], equipment: 'Peso corporal', category: 'STRENGTH',
    difficulty: 'Iniciante', instructions: '', notes: '', unilateral: false, timed: false,
    source: 'SYSTEM', externalId: null, sourceUrl: null, licenseName: null, licenseUrl: null,
    author: null, archived: false, createdAt: now.toISOString(), updatedAt: now.toISOString(),
    media: [], primaryVideo: null, primaryImage: null, hasVideo: false, primaryVideoUrl: null,
    primaryImageUrl: null, custom: false, mediaUrl: '', aliases: [], favorite: false,
    lastUsedAt: null, useCount: 0,
  }
}
