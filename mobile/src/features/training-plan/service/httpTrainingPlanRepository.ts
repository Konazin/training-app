import { apiClient } from '../../../config/api'
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
  list: () => apiClient.request<TrainingPlan[]>('/training-plans'),
  getById: (id) => apiClient.request<TrainingPlan>(`/training-plans/${id}`),
  create: (input) => apiClient.request<TrainingPlan>('/training-plans', {
    method: 'POST',
    body: JSON.stringify(input),
  }),
  update: (id, input) => apiClient.request<TrainingPlan>(`/training-plans/${id}`, json(input)),
  activate: (id) => apiClient.request<TrainingPlan>(`/training-plans/${id}/activate`, { method: 'POST' }),
  duplicate: (id) => apiClient.request<TrainingPlan>(`/training-plans/${id}/duplicate`, { method: 'POST' }),
  archive: (id, archived) =>
    apiClient.request<TrainingPlan>(`/training-plans/${id}/archive?archived=${archived}`, { method: 'PATCH' }),
  updateDay: (planId: number, dayId: number, input: TrainingPlanDayInput) =>
    apiClient.request<TrainingPlan>(`/training-plans/${planId}/days/${dayId}`, json(input)),
  addDayExercise: (planId: number, dayId: number, input: DayExerciseInput) =>
    apiClient.request<TrainingPlan>(`/training-plans/${planId}/days/${dayId}/exercises`, {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  updateDayExercise: (
    planId: number,
    dayId: number,
    exerciseId: number,
    input: DayExerciseConfigInput,
  ) => apiClient.request<TrainingPlan>(
    `/training-plans/${planId}/days/${dayId}/exercises/${exerciseId}`,
    json(input),
  ),
  removeDayExercise: (planId, dayId, exerciseId) =>
    apiClient.request<TrainingPlan>(`/training-plans/${planId}/days/${dayId}/exercises/${exerciseId}`, {
      method: 'DELETE',
    }),
  reorderDayExercises: (planId, dayId, exerciseIds) =>
    apiClient.request<TrainingPlan>(`/training-plans/${planId}/days/${dayId}/exercises/order`, json(exerciseIds)),
  addRestActivity: (planId: number, dayId: number, input: RestActivityInput) =>
    apiClient.request<TrainingPlan>(`/training-plans/${planId}/days/${dayId}/rest-activities`, {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  updateRestActivity: (
    planId: number,
    dayId: number,
    activityId: number,
    input: RestActivityInput,
  ) => apiClient.request<TrainingPlan>(
    `/training-plans/${planId}/days/${dayId}/rest-activities/${activityId}`,
    json(input),
  ),
  removeRestActivity: (planId, dayId, activityId) =>
    apiClient.request<TrainingPlan>(`/training-plans/${planId}/days/${dayId}/rest-activities/${activityId}`, {
      method: 'DELETE',
    }),
  reorderRestActivities: (planId, dayId, activityIds) =>
    apiClient.request<TrainingPlan>(`/training-plans/${planId}/days/${dayId}/rest-activities/order`, json(activityIds)),
}
