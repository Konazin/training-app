import type {
  CreateUmaCareerInput,
  StartUmaTrainingResult,
  UmaCareer,
  UmaTurn,
} from '../model/umaCareer'

export interface UmaCareerRepository {
  list(): Promise<UmaCareer[]>
  active(): Promise<UmaCareer | null>
  get(id: number): Promise<UmaCareer>
  turns(id: number): Promise<UmaTurn[]>
  create(input: CreateUmaCareerInput): Promise<UmaCareer>
  startTraining(id: number): Promise<StartUmaTrainingResult>
  acceptRestActivity(id: number, activityId: number): Promise<UmaCareer>
  completeRestActivity(id: number, activityId: number): Promise<UmaCareer>
  fullRest(id: number): Promise<UmaCareer>
  abandon(id: number): Promise<UmaCareer>
}
