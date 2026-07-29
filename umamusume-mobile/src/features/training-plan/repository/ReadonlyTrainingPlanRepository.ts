import type { TrainingPlan } from '@training/training-contracts'

export interface ReadonlyTrainingPlanRepository {
  listTrainingPlans(): Promise<TrainingPlan[]>
  getTrainingPlan(id: number): Promise<TrainingPlan>
}
