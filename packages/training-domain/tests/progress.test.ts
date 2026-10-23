import { describe, expect, it } from 'vitest'
import type { WorkoutSession } from '../model'
import {
  buildExerciseProgress,
  calculatePlates,
  detectSetRecords,
  estimateOneRepMax,
  sessionsToCsv,
} from '../progress'

function session(id: number, completedAt: string, sets: [number, number, boolean?][], name = 'Supino'): WorkoutSession {
  return {
    id, trainingPlanId: 1, planDayId: 1, workoutName: 'A', dayName: 'Seg',
    scheduledDate: completedAt.slice(0, 10), startedAt: completedAt, completedAt,
    pausedAt: null, pausedDurationSeconds: 0, status: 'COMPLETED', totalDurationSeconds: 0,
    overallRpe: null, notes: '', totalVolume: 0, completedSets: 0, totalPlannedSets: 0,
    exercises: [{
      id: id * 10, exerciseDefinitionId: 7, name, substituteExerciseDefinitionId: null,
      substituteName: null,
      sets: sets.map(([load, reps, completed = true], i) => ({
        id: i, setNumber: i + 1, reps, load, durationSeconds: 0, distance: 0,
        rpe: null, completed, completedAt: null, manuallyAdded: false, notes: '', volume: 0,
      })),
    }],
  } as unknown as WorkoutSession
}

describe('progresso por exercício', () => {
  it('estima 1RM por Epley', () => {
    expect(estimateOneRepMax(100, 1)).toBe(100)
    expect(estimateOneRepMax(100, 10)).toBe(133.3)
    expect(estimateOneRepMax(0, 10)).toBe(0)
  })

  it('monta pontos e recordes só com séries concluídas', () => {
    const progress = buildExerciseProgress([
      session(2, '2026-07-10T10:00:00.000Z', [[60, 8], [100, 1, false]]),
      session(1, '2026-07-01T10:00:00.000Z', [[50, 10]]),
    ], 7)
    expect(progress.points.map((p) => p.sessionId)).toEqual([1, 2])
    expect(progress.points[1]).toMatchObject({ topLoad: 60, volume: 480, sets: 1 })
    expect(progress.records.heaviestLoad).toMatchObject({ value: 60, reps: 8 })
    expect(progress.records.bestSessionVolume?.value).toBe(500)
  })

  it('detecta recorde apenas com histórico anterior', () => {
    const { records } = buildExerciseProgress([session(1, '2026-07-01T10:00:00.000Z', [[50, 10]])], 7)
    expect(detectSetRecords(records, 55, 5)).toContain('LOAD')
    expect(detectSetRecords(records, 40, 5)).toEqual([])
    expect(detectSetRecords(buildExerciseProgress([], 7).records, 55, 5)).toEqual([])
  })
})

describe('calculadora de anilhas', () => {
  it('divide por lado e informa o resto', () => {
    expect(calculatePlates(100, 20)).toMatchObject({ perSide: [25, 15], achieved: 100, remainder: 0 })
    expect(calculatePlates(21, 20)).toMatchObject({ perSide: [], achieved: 20, remainder: 1 })
    expect(calculatePlates(10, 20).perSide).toEqual([])
    expect(calculatePlates(Number.NaN).achieved).toBe(20)
  })
})

describe('exportação CSV', () => {
  it('gera cabeçalho, escapa campos e neutraliza fórmulas', () => {
    const csv = sessionsToCsv([session(1, '2026-07-01T10:00:00.000Z', [[50, 10]], '=Supino, "reto"')])
    const [header, row] = csv.split('\n')
    expect(header).toContain('carga_kg')
    expect(row).toContain('"\'=Supino, ""reto"""')
    expect(row).toContain(',50,')
  })
})
