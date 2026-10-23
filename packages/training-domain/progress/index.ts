import type { WorkoutSession } from '../model'
import { effectiveExerciseDefinitionId } from '../intelligence'

export interface ExerciseProgressPoint {
  sessionId: number
  completedAt: string
  topLoad: number
  topReps: number
  estimatedOneRepMax: number
  volume: number
  sets: number
}

export interface PersonalRecords {
  heaviestLoad: { value: number; reps: number; completedAt: string } | null
  bestOneRepMax: { value: number; completedAt: string } | null
  bestSessionVolume: { value: number; completedAt: string } | null
}

export interface ExerciseProgress {
  exerciseDefinitionId: number
  points: ExerciseProgressPoint[]
  records: PersonalRecords
}

/** Estimativa de 1RM (Epley). Retorna 0 sem carga ou repetições; 1 rep = a própria carga. */
export function estimateOneRepMax(load: number, reps: number) {
  if (!(load > 0) || !(reps > 0)) return 0
  if (reps === 1) return load
  return Math.round(load * (1 + reps / 30) * 10) / 10
}

/**
 * Pontos de evolução por sessão concluída (ordem cronológica) e recordes.
 * Considera só séries concluídas com carga; ignora sessões não concluídas.
 */
export function buildExerciseProgress(
  sessions: readonly WorkoutSession[],
  exerciseDefinitionId: number,
): ExerciseProgress {
  const points: ExerciseProgressPoint[] = []
  const ordered = sessions
    .filter((session) => session.status === 'COMPLETED' && session.completedAt)
    .sort((a, b) => a.completedAt!.localeCompare(b.completedAt!))
  for (const session of ordered) {
    const sets = session.exercises
      .filter((exercise) => effectiveExerciseDefinitionId(exercise) === exerciseDefinitionId)
      .flatMap((exercise) => exercise.sets)
      .filter((set) => set.completed && set.load > 0 && set.reps > 0)
    if (!sets.length) continue
    let top = sets[0]!
    let best = 0
    let volume = 0
    for (const set of sets) {
      if (set.load > top.load || (set.load === top.load && set.reps > top.reps)) top = set
      best = Math.max(best, estimateOneRepMax(set.load, set.reps))
      volume += set.load * set.reps
    }
    points.push({
      sessionId: session.id,
      completedAt: session.completedAt!,
      topLoad: top.load,
      topReps: top.reps,
      estimatedOneRepMax: best,
      volume,
      sets: sets.length,
    })
  }
  return { exerciseDefinitionId, points, records: personalRecords(points) }
}

function personalRecords(points: readonly ExerciseProgressPoint[]): PersonalRecords {
  const records: PersonalRecords = {
    heaviestLoad: null,
    bestOneRepMax: null,
    bestSessionVolume: null,
  }
  for (const point of points) {
    if (!records.heaviestLoad || point.topLoad > records.heaviestLoad.value) {
      records.heaviestLoad = { value: point.topLoad, reps: point.topReps, completedAt: point.completedAt }
    }
    if (!records.bestOneRepMax || point.estimatedOneRepMax > records.bestOneRepMax.value) {
      records.bestOneRepMax = { value: point.estimatedOneRepMax, completedAt: point.completedAt }
    }
    if (!records.bestSessionVolume || point.volume > records.bestSessionVolume.value) {
      records.bestSessionVolume = { value: point.volume, completedAt: point.completedAt }
    }
  }
  return records
}

export type RecordKind = 'LOAD' | 'ONE_REP_MAX'

/** Recordes batidos por uma série em relação ao histórico anterior (sem recorde se não há histórico). */
export function detectSetRecords(
  previous: PersonalRecords,
  load: number,
  reps: number,
): RecordKind[] {
  if (!previous.heaviestLoad || !(load > 0) || !(reps > 0)) return []
  const found: RecordKind[] = []
  if (load > previous.heaviestLoad.value) found.push('LOAD')
  if (previous.bestOneRepMax && estimateOneRepMax(load, reps) > previous.bestOneRepMax.value) {
    found.push('ONE_REP_MAX')
  }
  return found
}

export interface PlateBreakdown {
  perSide: number[]
  achieved: number
  remainder: number
}

export const DEFAULT_PLATES_KG = [25, 20, 15, 10, 5, 2.5, 1.25] as const

/**
 * Anilhas por lado para atingir a carga total, de forma gulosa.
 * `remainder` é o que não coube com as anilhas disponíveis (nunca negativo).
 */
export function calculatePlates(
  target: number,
  barWeight = 20,
  plates: readonly number[] = DEFAULT_PLATES_KG,
): PlateBreakdown {
  const safeTarget = Number.isFinite(target) ? target : 0
  let side = Math.max(0, (safeTarget - barWeight) / 2)
  const perSide: number[] = []
  for (const plate of [...plates].filter((value) => value > 0).sort((a, b) => b - a)) {
    while (side + 1e-9 >= plate) {
      perSide.push(plate)
      side -= plate
    }
  }
  const used = perSide.reduce((sum, plate) => sum + plate, 0)
  const achieved = Math.round((barWeight + used * 2) * 100) / 100
  return {
    perSide,
    achieved,
    remainder: Math.max(0, Math.round((safeTarget - achieved) * 100) / 100),
  }
}

const CSV_HEADER = [
  'data', 'treino', 'dia', 'status', 'exercicio', 'serie', 'repeticoes',
  'carga_kg', 'duracao_s', 'rpe', 'concluida',
]

function csvCell(value: string | number | boolean | null) {
  const text = value == null ? '' : String(value)
  // Evita injeção de fórmula em planilhas.
  const safe = /^[=+\-@\t\r]/.test(text) && Number.isNaN(Number(text)) ? `'${text}` : text
  return /[",\n\r;]/.test(safe) ? `"${safe.replaceAll('"', '""')}"` : safe
}

/** Histórico de séries em CSV (vírgula, UTF-8). Não inclui chaves, notas livres nem segredos. */
export function sessionsToCsv(sessions: readonly WorkoutSession[]) {
  const rows = [CSV_HEADER.join(',')]
  for (const session of sessions) {
    for (const exercise of session.exercises) {
      for (const set of exercise.sets) {
        rows.push([
          session.scheduledDate,
          session.workoutName,
          session.dayName,
          session.status,
          exercise.substituteName ?? exercise.name,
          set.setNumber,
          set.reps,
          set.load,
          set.durationSeconds,
          set.rpe,
          set.completed,
        ].map(csvCell).join(','))
      }
    }
  }
  return `${rows.join('\n')}\n`
}
