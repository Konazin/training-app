import type { ApiClient } from '@training/mobile-api'
import type {
  CreateUmaCareerInput,
  StartUmaTrainingResult,
  UmaCareer,
  UmaTurn,
} from '../model/umaCareer'
import type { UmaCareerRepository } from '../repository/UmaCareerRepository'

const post = (body?: unknown): RequestInit => ({
  method: 'POST',
  ...(body === undefined ? {} : { body: JSON.stringify(body) }),
})

export function createHttpUmaCareerRepository(api: ApiClient): UmaCareerRepository {
  return {
    list: () => api.request<UmaCareer[]>('/umamusume/careers'),
    turns: (id) => api.request<UmaTurn[]>(`/umamusume/careers/${id}/turns`),
    create: (input) => api.request<UmaCareer>('/umamusume/careers', post(input)),
    startTraining: (id) =>
      api.request<StartUmaTrainingResult>(`/umamusume/careers/${id}/start-training`, post()),
    acceptRestActivity: (id, activityId) =>
      api.request<UmaCareer>(
        `/umamusume/careers/${id}/rest-activities/${activityId}/accept`,
        post(),
      ),
    completeRestActivity: (id, activityId) =>
      api.request<UmaCareer>(
        `/umamusume/careers/${id}/rest-activities/${activityId}/complete`,
        post(),
      ),
    cancelRestActivity: (id) =>
      api.request<UmaCareer>(`/umamusume/careers/${id}/rest-activity/cancel`, post()),
    fullRest: (id) => api.request<UmaCareer>(`/umamusume/careers/${id}/full-rest`, post()),
    abandon: (id) => api.request<UmaCareer>(`/umamusume/careers/${id}/abandon`, post()),
  }
}
