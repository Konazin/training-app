import type { ApiClient } from '@training/mobile-api'
import type { TrainingPlan } from '@training/training-contracts'
import type { ReadonlyTrainingPlanRepository } from '../repository/ReadonlyTrainingPlanRepository'

export function createHttpReadonlyTrainingPlanRepository(
  api: ApiClient,
): ReadonlyTrainingPlanRepository {
  return {
    listTrainingPlans: () => api.request<TrainingPlan[]>('/training-plans'),
    getTrainingPlan: (id) => api.request<TrainingPlan>(`/training-plans/${id}`),
  }
}
