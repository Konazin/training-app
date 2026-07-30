import type {
  AppSettings,
  Dashboard,
  DayExerciseConfigInput,
  DayExerciseInput,
  ExerciseDefinition,
  ExerciseDefinitionInput,
  ExerciseLibraryQuery,
  ExternalExerciseCandidate,
  ExternalExerciseCatalogPage,
  ExternalExerciseCatalogQuery,
  ExternalExerciseImportPreview,
  ExternalExerciseImportResult,
  RestActivityInput,
  SessionExerciseStatus,
  SetLogInput,
  TrainingBackup,
  TrainingPlan,
  TrainingPlanDayInput,
  TrainingPlanInput,
  WorkoutSession,
} from '../model'
import type {
  TrainingPlanCreationInput,
  TrainingPlanDuplicateMode,
} from '../training-plans'

export interface ExerciseLibraryRepository {
  list(query?: ExerciseLibraryQuery): Promise<ExerciseDefinition[]>
  findById(id: number): Promise<ExerciseDefinition | null>
  search(query: string): Promise<ExerciseDefinition[]>
  create(input: ExerciseDefinitionInput): Promise<ExerciseDefinition>
  update(id: number, input: ExerciseDefinitionInput): Promise<ExerciseDefinition>
  archive(id: number): Promise<void>
  restore(id: number): Promise<void>
}

export interface TrainingPlanRepository {
  list(): Promise<TrainingPlan[]>
  findById(id: number): Promise<TrainingPlan | null>
  getById(id: number): Promise<TrainingPlan>
  create(input: TrainingPlanInput): Promise<TrainingPlan>
  createWithDays(input: TrainingPlanCreationInput): Promise<TrainingPlan>
  update(id: number, input: TrainingPlanInput): Promise<TrainingPlan>
  duplicate(id: number, mode: TrainingPlanDuplicateMode): Promise<TrainingPlan>
  activate(id: number): Promise<TrainingPlan>
  archive(id: number, archived?: boolean): Promise<TrainingPlan>
  updateDay(planId: number, dayId: number, input: TrainingPlanDayInput): Promise<TrainingPlan>
  addExercise(planId: number, dayId: number, input: DayExerciseInput): Promise<TrainingPlan>
  updateExercise(planId: number, dayId: number, exerciseId: number, input: DayExerciseConfigInput): Promise<TrainingPlan>
  removeExercise(planId: number, dayId: number, exerciseId: number): Promise<TrainingPlan>
  reorderExercise(planId: number, dayId: number, exerciseIds: number[]): Promise<TrainingPlan>
  addRestActivity(planId: number, dayId: number, input: RestActivityInput): Promise<TrainingPlan>
  updateRestActivity(planId: number, dayId: number, activityId: number, input: RestActivityInput): Promise<TrainingPlan>
  removeRestActivity(planId: number, dayId: number, activityId: number): Promise<TrainingPlan>
  reorderRestActivities(planId: number, dayId: number, activityIds: number[]): Promise<TrainingPlan>
}

export interface TrainingPlanTrashRepository {
  list(): Promise<TrainingPlan[]>
  count(): Promise<number>
  moveToTrash(planId: number, deletedAt?: string): Promise<TrainingPlan>
  restore(planId: number): Promise<TrainingPlan>
  deletePermanently(planId: number): Promise<void>
  emptyTrash(): Promise<number>
  purgeExpired(now?: string): Promise<number>
}

export interface WorkoutSessionRepository {
  getActive(): Promise<WorkoutSession | null>
  getHistory(): Promise<WorkoutSession[]>
  findById(id: number): Promise<WorkoutSession | null>
  start(trainingPlanId: number, planDayId: number): Promise<WorkoutSession>
  updateSet(sessionId: number, exerciseId: number, setId: number, input: SetLogInput): Promise<WorkoutSession>
  addSet(sessionId: number, exerciseId: number): Promise<WorkoutSession>
  removeSet(sessionId: number, exerciseId: number, setId: number): Promise<WorkoutSession>
  updateExerciseStatus(sessionId: number, exerciseId: number, status: SessionExerciseStatus): Promise<WorkoutSession>
  pause(sessionId: number): Promise<WorkoutSession>
  resume(sessionId: number): Promise<WorkoutSession>
  complete(sessionId: number, overallRpe: number | null, notes: string): Promise<WorkoutSession>
  abandon(sessionId: number): Promise<WorkoutSession>
}

export interface DashboardRepository {
  get(): Promise<Dashboard>
}

export interface SettingsRepository {
  get<T>(key: string): Promise<T | null>
  set(key: string, value: unknown): Promise<AppSettings>
  remove(key: string): Promise<void>
}

export interface BackupRepository {
  export(appVersion: string): Promise<TrainingBackup>
  restore(backup: TrainingBackup): Promise<void>
  reset(): Promise<void>
}

export interface SecretsRepository {
  get(key: string): Promise<string | null>
  set(key: string, value: string): Promise<void>
  remove(key: string): Promise<void>
}

export interface ExternalExerciseCatalogProvider {
  search(query: ExternalExerciseCatalogQuery): Promise<ExternalExerciseCatalogPage>
  findByExternalId(externalId: string, language?: string): Promise<ExternalExerciseCandidate | null>
}

export interface ExternalExerciseImportRepository {
  previewExisting(candidates: ExternalExerciseCandidate[]): Promise<ExternalExerciseImportPreview[]>
  importSelected(candidates: ExternalExerciseCandidate[]): Promise<ExternalExerciseImportResult>
  refreshImported(provider: ExternalExerciseCandidate['provider']): Promise<ExternalExerciseImportResult>
}
export interface AiTrainingPlanProvider {
  preview(input: Record<string, unknown>): Promise<TrainingPlanInput>
}
export interface HealthDataProvider {
  preview(input: Record<string, unknown>): Promise<Record<string, unknown>>
}
export interface RemoteBackupProvider {
  upload(backup: TrainingBackup): Promise<void>
  download(): Promise<TrainingBackup>
}
