import type {
  DayExerciseConfigInput,
  DayExerciseInput,
  RestActivityInput,
  TrainingPlan,
  TrainingPlanDayInput,
  TrainingPlanInput,
} from '../model/trainingPlan'

export interface TrainingPlanRepository {
  list(): Promise<TrainingPlan[]>
  getById(id: number): Promise<TrainingPlan>
  create(input: TrainingPlanInput): Promise<TrainingPlan>
  update(id: number, input: TrainingPlanInput): Promise<TrainingPlan>
  activate(id: number): Promise<TrainingPlan>
  duplicate(id: number): Promise<TrainingPlan>
  archive(id: number, archived: boolean): Promise<TrainingPlan>
  updateDay(planId: number, dayId: number, input: TrainingPlanDayInput): Promise<TrainingPlan>
  addDayExercise(planId: number, dayId: number, input: DayExerciseInput): Promise<TrainingPlan>
  updateDayExercise(planId: number, dayId: number, exerciseId: number, input: DayExerciseConfigInput): Promise<TrainingPlan>
  removeDayExercise(planId: number, dayId: number, exerciseId: number): Promise<TrainingPlan>
  reorderDayExercises(planId: number, dayId: number, exerciseIds: number[]): Promise<TrainingPlan>
  addRestActivity(planId: number, dayId: number, input: RestActivityInput): Promise<TrainingPlan>
  updateRestActivity(planId: number, dayId: number, activityId: number, input: RestActivityInput): Promise<TrainingPlan>
  removeRestActivity(planId: number, dayId: number, activityId: number): Promise<TrainingPlan>
  reorderRestActivities(planId: number, dayId: number, activityIds: number[]): Promise<TrainingPlan>
}
