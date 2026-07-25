import { request } from '../../../core/api/request'
import type {
  DayExerciseConfigInput,
  DayExerciseInput,
  RestActivityInput,
  TrainingPlan,
  TrainingPlanDayInput,
  TrainingPlanInput,
} from '../model/trainingPlan'
import type { TrainingPlanRepository } from '../repository/TrainingPlanRepository'

const json = (body: unknown): RequestInit => ({
  method: 'PUT',
  body: JSON.stringify(body),
})

export const httpTrainingPlanRepository: TrainingPlanRepository = {
  list: () => request<TrainingPlan[]>('/training-plans'),
  getById: (id) => request<TrainingPlan>(`/training-plans/${id}`),
  create: (input) => request<TrainingPlan>('/training-plans', {
    method: 'POST',
    body: JSON.stringify(input),
  }),
  update: (id, input) => request<TrainingPlan>(`/training-plans/${id}`, json(input)),
  activate: (id) => request<TrainingPlan>(`/training-plans/${id}/activate`, { method: 'POST' }),
  duplicate: (id) => request<TrainingPlan>(`/training-plans/${id}/duplicate`, { method: 'POST' }),
  archive: (id, archived) =>
    request<TrainingPlan>(`/training-plans/${id}/archive?archived=${archived}`, { method: 'PATCH' }),
  updateDay: (planId: number, dayId: number, input: TrainingPlanDayInput) =>
    request<TrainingPlan>(`/training-plans/${planId}/days/${dayId}`, json(input)),
  addDayExercise: (planId: number, dayId: number, input: DayExerciseInput) =>
    request<TrainingPlan>(`/training-plans/${planId}/days/${dayId}/exercises`, {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  updateDayExercise: (
    planId: number,
    dayId: number,
    exerciseId: number,
    input: DayExerciseConfigInput,
  ) => request<TrainingPlan>(
    `/training-plans/${planId}/days/${dayId}/exercises/${exerciseId}`,
    json(input),
  ),
  removeDayExercise: (planId, dayId, exerciseId) =>
    request<TrainingPlan>(`/training-plans/${planId}/days/${dayId}/exercises/${exerciseId}`, {
      method: 'DELETE',
    }),
  reorderDayExercises: (planId, dayId, exerciseIds) =>
    request<TrainingPlan>(`/training-plans/${planId}/days/${dayId}/exercises/order`, json(exerciseIds)),
  addRestActivity: (planId: number, dayId: number, input: RestActivityInput) =>
    request<TrainingPlan>(`/training-plans/${planId}/days/${dayId}/rest-activities`, {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  updateRestActivity: (
    planId: number,
    dayId: number,
    activityId: number,
    input: RestActivityInput,
  ) => request<TrainingPlan>(
    `/training-plans/${planId}/days/${dayId}/rest-activities/${activityId}`,
    json(input),
  ),
  removeRestActivity: (planId, dayId, activityId) =>
    request<TrainingPlan>(`/training-plans/${planId}/days/${dayId}/rest-activities/${activityId}`, {
      method: 'DELETE',
    }),
  reorderRestActivities: (planId, dayId, activityIds) =>
    request<TrainingPlan>(`/training-plans/${planId}/days/${dayId}/rest-activities/order`, json(activityIds)),
}
