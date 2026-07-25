import { request } from '../../../core/api/request'
import type {
  SessionExerciseStatus,
  SetLogInput,
  WorkoutSession,
} from '../model/workoutSession'
import type { WorkoutSessionRepository } from '../repository/WorkoutSessionRepository'

export const httpWorkoutSessionRepository: WorkoutSessionRepository = {
  getHistory: () => request<WorkoutSession[]>('/sessions'),
  async getActive() {
    return await request<WorkoutSession | undefined>('/sessions/active') ?? null
  },
  start: (trainingPlanId, planDayId) =>
    request<WorkoutSession>('/sessions', {
      method: 'POST',
      body: JSON.stringify({
        trainingPlanId,
        planDayId,
        scheduledDate: new Date().toISOString().slice(0, 10),
      }),
    }),
  updateSet: (sessionId: number, exerciseId: number, setId: number, input: SetLogInput) =>
    request<WorkoutSession>(`/sessions/${sessionId}/exercises/${exerciseId}/sets/${setId}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    }),
  addSet: (sessionId, exerciseId) =>
    request<WorkoutSession>(`/sessions/${sessionId}/exercises/${exerciseId}/sets`, { method: 'POST' }),
  removeSet: (sessionId, exerciseId, setId) =>
    request<WorkoutSession>(`/sessions/${sessionId}/exercises/${exerciseId}/sets/${setId}`, { method: 'DELETE' }),
  setExerciseStatus: (sessionId: number, exerciseId: number, status: SessionExerciseStatus) =>
    request<WorkoutSession>(`/sessions/${sessionId}/exercises/${exerciseId}/status?status=${status}`, { method: 'PATCH' }),
  pause: (sessionId) =>
    request<WorkoutSession>(`/sessions/${sessionId}/pause`, { method: 'POST' }),
  resume: (sessionId) =>
    request<WorkoutSession>(`/sessions/${sessionId}/resume`, { method: 'POST' }),
  complete: (sessionId, overallRpe, notes) =>
    request<WorkoutSession>(`/sessions/${sessionId}/complete`, {
      method: 'POST',
      body: JSON.stringify({ overallRpe, notes }),
    }),
  abandon: (sessionId) =>
    request<WorkoutSession>(`/sessions/${sessionId}/abandon`, {
      method: 'POST',
      body: '{}',
    }),
}
