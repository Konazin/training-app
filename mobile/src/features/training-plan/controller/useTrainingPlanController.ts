import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type {
  DayExerciseConfigInput,
  DayExerciseInput,
  RestActivityInput,
  TrainingPlan,
  TrainingPlanDayInput,
  TrainingPlanInput,
} from '../model/trainingPlan'
import type { TrainingPlanRepository } from '../repository/TrainingPlanRepository'

export function useTrainingPlanController(
  repository: TrainingPlanRepository,
  onChanged?: () => Promise<unknown>,
) {
  const [trainingPlans, setTrainingPlans] = useState<TrainingPlan[]>([])
  const [selectedTrainingPlanId, setSelectedTrainingPlanId] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [busyKeys, setBusyKeys] = useState<Set<string>>(new Set())
  const [errors, setErrors] = useState<Record<string, string>>({})
  const busyRef = useRef(new Set<string>())
  const selectedTrainingPlan = useMemo(
    () => trainingPlans.find((plan) => plan.id === selectedTrainingPlanId),
    [selectedTrainingPlanId, trainingPlans],
  )

  useEffect(() => {
    if (selectedTrainingPlanId == null) return
    const selected = trainingPlans.find((plan) => plan.id === selectedTrainingPlanId)
    if (!selected || selected.archived) {
      setSelectedTrainingPlanId(chooseInitialPlan(trainingPlans)?.id ?? null)
    }
  }, [selectedTrainingPlanId, trainingPlans])

  const refresh = useCallback(async () => {
    setLoading(true)
    setErrors((current) => ({ ...current, general: '' }))
    try {
      const plans = await repository.list()
      setTrainingPlans(plans)
      setSelectedTrainingPlanId(chooseInitialPlan(plans)?.id ?? null)
      return true
    } catch (cause) {
      setErrors((current) => ({ ...current, general: messageFrom(cause) }))
      return false
    } finally {
      setLoading(false)
    }
  }, [repository])

  const mutate = useCallback(async (
    key: string,
    operation: () => Promise<TrainingPlan>,
    options?: { select?: boolean; activate?: boolean },
  ) => {
    if (busyRef.current.has(key)) return false
    busyRef.current.add(key)
    setBusyKeys(new Set(busyRef.current))
    setErrors((current) => ({ ...current, [key]: '' }))
    try {
      const updated = await operation()
      setTrainingPlans((current) => {
        let next = current.some((plan) => plan.id === updated.id)
          ? current.map((plan) => plan.id === updated.id ? updated : plan)
          : [updated, ...current]
        if (options?.activate) {
          next = next.map((plan) => ({ ...plan, active: plan.id === updated.id }))
        }
        return next
      })
      if (options?.select) setSelectedTrainingPlanId(updated.id)
      await onChanged?.()
      return true
    } catch (cause) {
      setErrors((current) => ({ ...current, [key]: messageFrom(cause) }))
      return false
    } finally {
      busyRef.current.delete(key)
      setBusyKeys(new Set(busyRef.current))
    }
  }, [onChanged])

  const create = useCallback(
    (input: TrainingPlanInput) =>
      mutate('plan:create', () => repository.create(input), { select: true }),
    [mutate, repository],
  )
  const update = useCallback(
    (id: number, input: TrainingPlanInput) =>
      mutate(`plan:update:${id}`, () => repository.update(id, input)),
    [mutate, repository],
  )
  const activate = useCallback(
    (id: number) =>
      mutate(`plan:activate:${id}`, () => repository.activate(id), { activate: true, select: true }),
    [mutate, repository],
  )
  const duplicate = useCallback(
    (id: number) =>
      mutate(`plan:duplicate:${id}`, () => repository.duplicate(id), { select: true }),
    [mutate, repository],
  )
  const archive = useCallback(
    (id: number, archived = true) =>
      mutate(`plan:archive:${id}`, () => repository.archive(id, archived)),
    [mutate, repository],
  )
  const updateDay = useCallback(
    (planId: number, dayId: number, input: TrainingPlanDayInput) =>
      mutate(`day:update:${dayId}`, () => repository.updateDay(planId, dayId, input)),
    [mutate, repository],
  )
  const addDayExercise = useCallback(
    (planId: number, dayId: number, input: DayExerciseInput) =>
      mutate(`day:exercise:add:${dayId}`, () => repository.addExercise(planId, dayId, input)),
    [mutate, repository],
  )
  const updateDayExercise = useCallback(
    (planId: number, dayId: number, exerciseId: number, input: DayExerciseConfigInput) =>
      mutate(`exercise:update:${exerciseId}`, () =>
        repository.updateExercise(planId, dayId, exerciseId, input)),
    [mutate, repository],
  )
  const removeDayExercise = useCallback(
    (planId: number, dayId: number, exerciseId: number) =>
      mutate(`exercise:remove:${exerciseId}`, () =>
        repository.removeExercise(planId, dayId, exerciseId)),
    [mutate, repository],
  )
  const reorderDayExercises = useCallback(
    (planId: number, dayId: number, exerciseIds: number[]) =>
      mutate(`day:exercise:reorder:${dayId}`, () => repository.reorderExercise(planId, dayId, exerciseIds)),
    [mutate, repository],
  )
  const addRestActivity = useCallback(
    (planId: number, dayId: number, input: RestActivityInput) =>
      mutate(`day:activity:add:${dayId}`, () => repository.addRestActivity(planId, dayId, input)),
    [mutate, repository],
  )
  const updateRestActivity = useCallback(
    (planId: number, dayId: number, activityId: number, input: RestActivityInput) =>
      mutate(`activity:update:${activityId}`, () =>
        repository.updateRestActivity(planId, dayId, activityId, input)),
    [mutate, repository],
  )
  const removeRestActivity = useCallback(
    (planId: number, dayId: number, activityId: number) =>
      mutate(`activity:remove:${activityId}`, () =>
        repository.removeRestActivity(planId, dayId, activityId)),
    [mutate, repository],
  )
  const reorderRestActivities = useCallback(
    (planId: number, dayId: number, activityIds: number[]) =>
      mutate(`day:activity:reorder:${dayId}`, () => repository.reorderRestActivities(planId, dayId, activityIds)),
    [mutate, repository],
  )

  return {
    trainingPlans,
    selectedTrainingPlanId,
    selectedTrainingPlan,
    setSelectedTrainingPlanId,
    loading,
    busyKeys,
    errors,
    message: errors.general ?? '',
    refresh,
    create,
    update,
    activate,
    duplicate,
    archive,
    updateDay,
    addDayExercise,
    updateDayExercise,
    removeDayExercise,
    reorderDayExercises,
    addRestActivity,
    updateRestActivity,
    removeRestActivity,
    reorderRestActivities,
  }
}

function chooseInitialPlan(plans: TrainingPlan[]) {
  return plans.find((plan) => plan.active && !plan.archived)
    ?? plans.find((plan) => !plan.archived)
}

function messageFrom(cause: unknown) {
  return cause instanceof Error ? cause.message : 'Ocorreu um erro inesperado.'
}
