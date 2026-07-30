import { describe, expect, it } from 'vitest'
import type {
  ExerciseDefinition,
  SessionExercise,
  WorkoutSession,
} from '../model'
import {
  buildLocalNotices,
  rankExerciseSubstitutions,
  selectPreviousPerformance,
  suggestProgression,
} from '../intelligence'
import {
  getExerciseProviderDescriptor,
  listExerciseProviders,
  providerSupports,
} from '../providers'

describe('inteligência local de treino', () => {
  it('expõe capacidades imutáveis do provider manual', () => {
    expect(listExerciseProviders()).toHaveLength(1)
    expect(getExerciseProviderDescriptor('WGER')).toMatchObject({
      requiresNetwork: true,
      automaticBootstrap: false,
    })
    expect(providerSupports('WGER', 'IMPORT')).toBe(true)
    expect(Object.isFrozen(listExerciseProviders()[0])).toBe(true)
  })

  it('seleciona apenas o último snapshot concluído da mesma ficha sem alterar entradas', () => {
    const sessions = [
      session(1, 'ABANDONED', 1, '2026-07-30T12:00:00.000Z', 99),
      session(2, 'COMPLETED', 2, '2026-07-29T12:00:00.000Z', 20),
      session(3, 'COMPLETED', 1, '2026-07-28T12:00:00.000Z', 10),
    ] as const
    const original = JSON.stringify(sessions)
    expect(selectPreviousPerformance(sessions, 7, 1)).toMatchObject({
      sessionId: 3,
      load: 10,
      reps: [10],
      completedSetCount: 1,
      annotation: 'Boa execução',
    })
    expect(JSON.stringify(sessions)).toBe(original)
  })

  it('aplica regras determinísticas para carga, esforço, tempo, peso corporal e ausência de histórico', () => {
    const exercise = snapshot()
    expect(suggestProgression(exercise, null).type).toBe('NO_HISTORY')
    expect(suggestProgression(exercise, performance(20, 7)).proposedLoad).toBe(20.5)
    expect(suggestProgression(exercise, performance(20, 8.5)).type).toBe('KEEP_LOAD')
    expect(suggestProgression(exercise, performance(20, 9.5)).type).toBe('REDUCE_LOAD')
    expect(suggestProgression({ ...exercise, timed: true }, performance(0, 7)))
      .toMatchObject({ type: 'INCREASE_REPS', proposedDurationSeconds: 35 })
    expect(suggestProgression(exercise, performance(0, 7), true).type).toBe('INCREASE_REPS')
  })

  it('ordena substituições locais, remove duplicatas e preserva os candidatos', () => {
    const current = definition(1, 'Atual', 'Barra')
    const candidates = [
      definition(4, 'Zeta', 'Halter'),
      { ...definition(2, 'Beta', 'Barra'), favorite: true },
      definition(2, 'Duplicado', 'Barra'),
      { ...definition(3, 'Arquivado', 'Barra'), archived: true },
    ]
    const original = JSON.stringify(candidates)
    expect(rankExerciseSubstitutions(current, candidates).map((item) => item.exercise.id))
      .toEqual([2, 4])
    expect(JSON.stringify(candidates)).toBe(original)
  })

  it('calcula avisos locais sem efeitos colaterais', () => {
    expect(buildLocalNotices({
      activeSession: session(1, 'PAUSED', 1, null, 0),
      hasActivePlan: false,
      providerMediaUnavailable: true,
    }).map((notice) => notice.kind)).toEqual([
      'ACTIVE_SESSION',
      'NO_ACTIVE_PLAN',
      'PROVIDER_MEDIA',
    ])
  })
})

function performance(load: number, averageRpe: number) {
  return {
    sessionId: 1,
    completedAt: '2026-07-29T12:00:00.000Z',
    load,
    reps: [10, 10, 10],
    durations: [30, 30, 30],
    completedSetCount: 3,
    averageRpe,
    lastRpe: averageRpe,
    annotation: null,
  }
}

function session(
  id: number,
  status: WorkoutSession['status'],
  trainingPlanId: number,
  completedAt: string | null,
  load: number,
): WorkoutSession {
  return {
    id,
    trainingPlanId,
    planDayId: 1,
    workoutName: 'Ficha',
    dayName: 'Dia',
    scheduledDate: '2026-07-30',
    startedAt: '2026-07-30T10:00:00.000Z',
    completedAt,
    pausedAt: null,
    pausedDurationSeconds: 0,
    status,
    totalDurationSeconds: 0,
    overallRpe: null,
    notes: '',
    exercises: [{ ...snapshot(), sets: [{
      id: 1,
      setNumber: 1,
      reps: 10,
      load,
      durationSeconds: 0,
      distance: 0,
      rpe: 7,
      completed: true,
      completedAt,
      manuallyAdded: false,
      notes: '',
      volume: load * 10,
    }] }],
    totalVolume: load * 10,
    completedSets: 1,
    totalPlannedSets: 3,
  }
}

function snapshot(): SessionExercise {
  return {
    id: 1,
    exerciseDefinitionId: 7,
    name: 'Supino',
    muscleGroup: 'Peitoral',
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
    plannedSets: 3,
    plannedMinReps: 8,
    plannedMaxReps: 10,
    plannedLoad: 20,
    plannedDurationSeconds: null,
    plannedDistance: null,
    restSeconds: 60,
    setType: 'NORMAL',
    status: 'PENDING',
    notes: '',
    userNotes: 'Boa execução',
    substituteExerciseDefinitionId: null,
    substituteName: null,
    substitutionReason: null,
    sets: [],
  }
}

function definition(id: number, name: string, equipment: string): ExerciseDefinition {
  return {
    id,
    name,
    normalizedName: name.toLocaleLowerCase('pt-BR'),
    description: '',
    primaryMuscleGroup: 'Peitoral',
    secondaryMuscleGroups: [],
    equipment,
    category: 'STRENGTH',
    difficulty: '',
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
    aliases: [],
    favorite: false,
    lastUsedAt: null,
    useCount: 0,
  }
}
