import type {
  SessionExerciseStatus,
  SetLogInput,
  WorkoutSession,
} from '../model/workoutSession'

export interface WorkoutSessionRepository {
  getHistory(): Promise<WorkoutSession[]>
  getActive(): Promise<WorkoutSession | null>
  start(trainingPlanId: number, planDayId: number): Promise<WorkoutSession>
  updateSet(sessionId: number, exerciseId: number, setId: number, input: SetLogInput): Promise<WorkoutSession>
  addSet(sessionId: number, exerciseId: number): Promise<WorkoutSession>
  removeSet(sessionId: number, exerciseId: number, setId: number): Promise<WorkoutSession>
  setExerciseStatus(sessionId: number, exerciseId: number, status: SessionExerciseStatus): Promise<WorkoutSession>
  pause(sessionId: number): Promise<WorkoutSession>
  resume(sessionId: number): Promise<WorkoutSession>
  complete(sessionId: number, overallRpe: number | null, notes: string): Promise<WorkoutSession>
  abandon(sessionId: number): Promise<WorkoutSession>
}
