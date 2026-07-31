import type {
  ExerciseDefinition,
  SessionExercise,
  WorkoutSession,
} from '../model'

export type ProgressionSuggestion =
  | 'SMALL_LOAD_INCREASE'
  | 'KEEP_LOAD'
  | 'REPEAT_TARGET'
  | 'REDUCE_LOAD'
  | 'INCREASE_REPS'
  | 'NO_HISTORY'

export interface PreviousPerformance {
  sessionId: number
  completedAt: string
  load: number | null
  reps: number[]
  durations: number[]
  completedSetCount: number
  rpeCount: number
  averageRpe: number | null
  lastRpe: number | null
  annotation: string | null
}

export interface LocalProgressionSuggestion {
  type: ProgressionSuggestion
  reason: string
  proposedLoad: number | null
  proposedReps: number | null
  proposedDurationSeconds: number | null
}

export interface ExerciseSubstitution {
  exercise: ExerciseDefinition
  reason: string
}

export function effectiveExerciseDefinitionId(
  exercise: Pick<SessionExercise, 'exerciseDefinitionId' | 'substituteExerciseDefinitionId'>,
) {
  return exercise.substituteExerciseDefinitionId ?? exercise.exerciseDefinitionId
}

export function selectPreviousPerformance(
  sessions: readonly WorkoutSession[],
  exerciseDefinitionId: number,
  trainingPlanId?: number,
): PreviousPerformance | null {
  const completed = sessions
    .filter((session) => session.status === 'COMPLETED' && session.completedAt)
    .filter((session) => session.exercises.some((exercise) =>
      effectiveExerciseDefinitionId(exercise) === exerciseDefinitionId))
  const samePlan = trainingPlanId == null
    ? completed
    : completed.filter((session) => session.trainingPlanId === trainingPlanId)
  const selected = [...(samePlan.length ? samePlan : completed)]
    .sort((first, second) => second.completedAt!.localeCompare(first.completedAt!))[0]
  if (!selected) return null
  const exercise = selected.exercises.find((item) =>
    effectiveExerciseDefinitionId(item) === exerciseDefinitionId)!
  const sets = exercise.sets.filter((set) => set.completed)
  const rpes = sets.flatMap((set) => set.rpe == null ? [] : [set.rpe])
  const loads = sets.map((set) => set.load).filter((load) => load > 0)
  return {
    sessionId: selected.id,
    completedAt: selected.completedAt!,
    load: loads.at(-1) ?? null,
    reps: sets.map((set) => set.reps),
    durations: sets.map((set) => set.durationSeconds),
    completedSetCount: sets.length,
    rpeCount: rpes.length,
    averageRpe: rpes.length ? rpes.reduce((sum, value) => sum + value, 0) / rpes.length : null,
    lastRpe: rpes.at(-1) ?? selected.overallRpe,
    annotation: exercise.userNotes.trim() || null,
  }
}

export function suggestProgression(
  exercise: Pick<SessionExercise, 'plannedSets' | 'plannedMaxReps' | 'plannedLoad' | 'plannedDurationSeconds' | 'timed' | 'category'>,
  previous: PreviousPerformance | null,
  bodyweight = false,
): LocalProgressionSuggestion {
  if (!previous) return suggestion('NO_HISTORY', 'Ainda não há sessão concluída suficiente.', null, null, null)
  const allSets = previous.completedSetCount >= exercise.plannedSets
  const highEffort = previous.averageRpe != null && previous.averageRpe > 9
  const moderateEffort = previous.averageRpe != null && previous.averageRpe >= 8
  const timed = exercise.timed || exercise.category === 'CARDIO'
  if (!allSets || highEffort) {
    if (!timed && !bodyweight && highEffort && previous.load) {
      return suggestion(
        'REDUCE_LOAD',
        'A sessão anterior teve esforço acima de 9 ou séries incompletas.',
        roundHalf(previous.load * 0.975),
        null,
        null,
      )
    }
    return suggestion('REPEAT_TARGET', 'Repita o alvo porque houve séries incompletas ou esforço alto.', null, null, null)
  }
  if (previous.averageRpe == null || previous.rpeCount < previous.completedSetCount) {
    return suggestion(
      'KEEP_LOAD',
      'Mantenha o alvo: faltou registrar o RPE de uma ou mais séries.',
      timed || bodyweight ? null : previous.load,
      null,
      null,
    )
  }
  if (moderateEffort) {
    return suggestion('KEEP_LOAD', 'Todas as séries foram concluídas com esforço entre 8 e 9.', previous.load, null, null)
  }
  if (timed) {
    return suggestion(
      'INCREASE_REPS',
      'Todas as séries foram concluídas com esforço controlado; aumente levemente a duração.',
      null,
      null,
      Math.max(exercise.plannedDurationSeconds ?? 0, ...previous.durations, 0) + 5,
    )
  }
  if (bodyweight) {
    return suggestion(
      'INCREASE_REPS',
      'Todas as séries foram concluídas com esforço controlado.',
      null,
      Math.max(exercise.plannedMaxReps, ...previous.reps, 0) + 1,
      null,
    )
  }
  if (previous.load) {
    return suggestion(
      'SMALL_LOAD_INCREASE',
      'Todas as séries foram concluídas com RPE médio até 7.',
      roundHalf(previous.load * 1.025),
      null,
      null,
    )
  }
  return suggestion('REPEAT_TARGET', 'O desempenho anterior não contém carga válida.', null, null, null)
}

export function rankExerciseSubstitutions(
  current: ExerciseDefinition,
  candidates: readonly ExerciseDefinition[],
): ExerciseSubstitution[] {
  return candidates
    .filter((candidate) => candidate.id !== current.id && !candidate.archived)
    .filter((candidate, index, source) =>
      source.findIndex((item) => item.id === candidate.id) === index)
    .map((exercise) => ({
      exercise,
      score: Number(exercise.primaryMuscleGroup === current.primaryMuscleGroup) * 32
        + Number(exercise.category === current.category) * 16
        + Number(exercise.equipment === current.equipment) * 8
        + Number(exercise.favorite) * 4
        + Number(Boolean(exercise.lastUsedAt)) * 2,
    }))
    .filter((candidate) => candidate.exercise.primaryMuscleGroup === current.primaryMuscleGroup)
    .sort((first, second) =>
      second.score - first.score
      || (second.exercise.lastUsedAt ?? '').localeCompare(first.exercise.lastUsedAt ?? '')
      || first.exercise.name.localeCompare(second.exercise.name, 'pt-BR'))
    .map(({ exercise }) => ({
      exercise,
      reason: exercise.equipment === current.equipment
        ? 'Mesmo grupo muscular e equipamento semelhante.'
        : exercise.category === current.category
          ? 'Mesmo grupo muscular e categoria compatível.'
          : 'Mesmo grupo muscular.',
    }))
}

export type LocalNoticeKind = 'ACTIVE_SESSION' | 'NO_ACTIVE_PLAN' | 'PROVIDER_MEDIA'

export interface LocalNotice {
  id: string
  kind: LocalNoticeKind
  message: string
}

export function buildLocalNotices(input: {
  activeSession: WorkoutSession | null
  hasActivePlan: boolean
  providerMediaUnavailable: boolean
}) {
  const notices: LocalNotice[] = []
  if (input.activeSession) {
    notices.push({
      id: `session:${input.activeSession.id}`,
      kind: 'ACTIVE_SESSION',
      message: input.activeSession.status === 'PAUSED'
        ? 'Há uma sessão pausada aguardando continuação.'
        : 'Há uma sessão em andamento.',
    })
  }
  if (!input.hasActivePlan) {
    notices.push({ id: 'plan:none', kind: 'NO_ACTIVE_PLAN', message: 'Nenhuma ficha de treino está ativa.' })
  }
  if (input.providerMediaUnavailable) {
    notices.push({
      id: 'provider:media',
      kind: 'PROVIDER_MEDIA',
      message: 'Há exercício importado com mídia indisponível no momento.',
    })
  }
  return notices
}

function suggestion(
  type: ProgressionSuggestion,
  reason: string,
  proposedLoad: number | null,
  proposedReps: number | null,
  proposedDurationSeconds: number | null,
): LocalProgressionSuggestion {
  return { type, reason, proposedLoad, proposedReps, proposedDurationSeconds }
}

function roundHalf(value: number) {
  return Math.round(value * 2) / 2
}
