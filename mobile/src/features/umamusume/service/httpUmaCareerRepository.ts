import { request } from '../../../core/api/request'
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

export const httpUmaCareerRepository: UmaCareerRepository = {
  list: () => request<UmaCareer[]>('/umamusume/careers'),
  async active() {
    return await request<UmaCareer | undefined>('/umamusume/careers/active') ?? null
  },
  get: (id) => request<UmaCareer>(`/umamusume/careers/${id}`),
  turns: (id) => request<UmaTurn[]>(`/umamusume/careers/${id}/turns`),
  create: (input) => request<UmaCareer>('/umamusume/careers', post(input)),
  startTraining: (id) =>
    request<StartUmaTrainingResult>(`/umamusume/careers/${id}/start-training`, post()),
  acceptRestActivity: (id, activityId) =>
    request<UmaCareer>(
      `/umamusume/careers/${id}/rest-activities/${activityId}/accept`,
      post(),
    ),
  completeRestActivity: (id, activityId) =>
    request<UmaCareer>(
      `/umamusume/careers/${id}/rest-activities/${activityId}/complete`,
      post(),
    ),
  fullRest: (id) => request<UmaCareer>(`/umamusume/careers/${id}/full-rest`, post()),
  abandon: (id) => request<UmaCareer>(`/umamusume/careers/${id}/abandon`, post()),
}
