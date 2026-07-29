import type { ApiClient } from '@training/mobile-api'
import type {
  CompleteWorkoutSessionInput,
  SessionExerciseStatus,
  SetLogInput,
  StartWorkoutSessionInput,
  WorkoutSession,
} from '@training/training-contracts'
import type { WorkoutSessionRepository } from '../repository/WorkoutSessionRepository'

export function createHttpWorkoutSessionRepository(api: ApiClient): WorkoutSessionRepository {
  return {
    getHistory: () => api.request<WorkoutSession[]>('/sessions'),
    async getActive() {
      return await api.request<WorkoutSession | undefined>('/sessions/active') ?? null
    },
    start: (trainingPlanId, planDayId) =>
      api.request<WorkoutSession>('/sessions', {
        method: 'POST',
        body: JSON.stringify({
          trainingPlanId,
          planDayId,
          scheduledDate: new Date().toISOString().slice(0, 10),
        } satisfies StartWorkoutSessionInput),
      }),
    updateSet: (sessionId, exerciseId, setId, input: SetLogInput) =>
      api.request<WorkoutSession>(`/sessions/${sessionId}/exercises/${exerciseId}/sets/${setId}`, {
        method: 'PUT',
        body: JSON.stringify(input),
      }),
    addSet: (sessionId, exerciseId) =>
      api.request<WorkoutSession>(`/sessions/${sessionId}/exercises/${exerciseId}/sets`, {
        method: 'POST',
      }),
    removeSet: (sessionId, exerciseId, setId) =>
      api.request<WorkoutSession>(`/sessions/${sessionId}/exercises/${exerciseId}/sets/${setId}`, {
        method: 'DELETE',
      }),
    setExerciseStatus: (sessionId, exerciseId, status: SessionExerciseStatus) =>
      api.request<WorkoutSession>(
        `/sessions/${sessionId}/exercises/${exerciseId}/status?status=${status}`,
        { method: 'PATCH' },
      ),
    pause: (sessionId) =>
      api.request<WorkoutSession>(`/sessions/${sessionId}/pause`, { method: 'POST' }),
    resume: (sessionId) =>
      api.request<WorkoutSession>(`/sessions/${sessionId}/resume`, { method: 'POST' }),
    complete: (sessionId, overallRpe, notes) =>
      api.request<WorkoutSession>(`/sessions/${sessionId}/complete`, {
        method: 'POST',
        body: JSON.stringify({ overallRpe, notes } satisfies CompleteWorkoutSessionInput),
      }),
    abandon: (sessionId) =>
      api.request<WorkoutSession>(`/sessions/${sessionId}/abandon`, {
        method: 'POST',
        body: '{}',
      }),
  }
}
