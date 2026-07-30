export const WEEKDAYS = [
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
  'SUNDAY',
] as const

export type Weekday = typeof WEEKDAYS[number]
export type ExerciseCategory =
  | 'STRENGTH' | 'HYPERTROPHY' | 'ENDURANCE' | 'CARDIO'
  | 'MOBILITY' | 'STRETCHING' | 'TECHNIQUE' | 'RECOVERY'
export type ExerciseSource = 'SYSTEM' | 'CUSTOM' | 'WGER'
export type ExerciseMediaType = 'IMAGE' | 'VIDEO'
export type ExerciseMediaSource = 'SYSTEM' | 'CUSTOM' | 'WGER' | 'LEGACY'
export type SetType =
  | 'NORMAL' | 'WARM_UP' | 'DROP_SET' | 'BI_SET'
  | 'CIRCUIT' | 'TO_FAILURE' | 'CONTROLLED_TEMPO'
export type SessionStatus = 'IN_PROGRESS' | 'PAUSED' | 'COMPLETED' | 'ABANDONED'
export type SessionExerciseStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'SKIPPED'
export type AutomaticBackupReason =
  | 'BEFORE_IMPORT'
  | 'BEFORE_ERASE'
  | 'BEFORE_RESET_SEED'
  | 'BEFORE_EMPTY_TRASH'

export interface AutomaticBackupInfo {
  uri: string
  fileName: string
  createdAt: string
  sizeBytes: number
  reason: AutomaticBackupReason
}

export interface ExerciseMedia {
  id: number
  exerciseDefinitionId: number
  type: ExerciseMediaType
  source: ExerciseMediaSource
  externalId: string | null
  remoteUrl: string | null
  localUri: string | null
  thumbnailRemoteUrl: string | null
  thumbnailLocalUri: string | null
  mimeType: string | null
  width: number | null
  height: number | null
  durationSeconds: number | null
  main: boolean
  sortOrder: number
  licenseName: string | null
  licenseUrl: string | null
  author: string | null
  sourceUrl: string | null
  downloadedAt: string | null
  createdAt: string
  updatedAt: string
  /** Compatibilidade de leitura durante a transição. */
  url: string
  thumbnailUrl: string | null
}

export interface ExerciseDefinition {
  id: number
  name: string
  normalizedName: string
  description: string
  primaryMuscleGroup: string
  secondaryMuscleGroups: string[]
  equipment: string
  category: ExerciseCategory
  difficulty: string
  instructions: string
  notes: string
  unilateral: boolean
  timed: boolean
  source: ExerciseSource
  externalId: string | null
  sourceUrl: string | null
  licenseName: string | null
  licenseUrl: string | null
  author: string | null
  archived: boolean
  createdAt: string
  updatedAt: string
  media: ExerciseMedia[]
  primaryVideo: ExerciseMedia | null
  primaryImage: ExerciseMedia | null
  hasVideo: boolean
  primaryVideoUrl: string | null
  primaryImageUrl: string | null
  custom: boolean
  /** Campo legado aceito apenas na borda visual. */
  mediaUrl: string
}

export interface ExerciseDefinitionInput {
  name: string
  description: string
  primaryMuscleGroup: string
  secondaryMuscleGroups: string[]
  equipment: string
  category: ExerciseCategory
  difficulty: string
  instructions: string
  notes: string
  unilateral: boolean
  timed: boolean
}

export interface ExternalExerciseCatalogQuery {
  page: number
  pageSize: number
  language: string
  fallbackLanguage: string
  text: string
  categoryIds: number[]
  muscleIds: number[]
  equipmentIds: number[]
  onlyWithImage: boolean
  onlyWithVideo: boolean
}

export interface ExternalExerciseMediaCandidate {
  type: ExerciseMediaType
  source: ExerciseMediaSource
  externalId: string
  remoteUrl: string
  thumbnailRemoteUrl: string | null
  mimeType: string | null
  width: number | null
  height: number | null
  durationSeconds: number | null
  main: boolean
  sortOrder: number
  licenseName: string | null
  licenseUrl: string | null
  author: string | null
  sourceUrl: string | null
}

export interface ExternalExerciseCandidate {
  provider: 'WGER'
  externalId: string
  name: string
  description: string
  primaryMuscleGroup: string
  secondaryMuscleGroups: string[]
  equipment: string
  category: ExerciseCategory
  difficulty: string
  instructions: string
  unilateral: boolean
  timed: boolean
  sourceUrl: string
  licenseName: string | null
  licenseUrl: string | null
  author: string | null
  media: ExternalExerciseMediaCandidate[]
  warnings: string[]
  language: string
  original: unknown
}

export interface ExternalExerciseCatalogPage {
  items: ExternalExerciseCandidate[]
  page: number
  pageSize: number
  total: number
  hasNext: boolean
  hasPrevious: boolean
  nextCursor?: string
}

export interface ExternalExerciseImportPreview {
  externalId: string
  existingId: number | null
  alreadyImported: boolean
}

export interface ExternalExerciseImportResult {
  created: number
  updated: number
  unchanged: number
  skipped: number
  failed: number
  warnings: string[]
  affectedIds: number[]
}

export interface DayExerciseConfigInput {
  sets: number
  minReps: number
  maxReps: number
  plannedLoad: number | null
  plannedDurationSeconds: number | null
  plannedDistance: number | null
  restSeconds: number
  plannedRpe: number | null
  setType: SetType
  notes: string
  alternativeExerciseId: number | null
}

export interface DayExerciseInput extends DayExerciseConfigInput {
  exerciseDefinitionId: number
}

export interface TrainingDayExercise extends DayExerciseConfigInput {
  id: number
  exercise: ExerciseDefinition
  sortOrder: number
}

export interface RestActivity {
  id: number
  name: string
  description: string
  estimatedDurationMinutes: number
  category: string
  optional: boolean
  sortOrder: number
}

export interface RestActivityInput {
  name: string
  description: string
  estimatedDurationMinutes: number
  category: string
  optional: boolean
}

export interface TrainingPlanDay {
  id: number
  weekday: Weekday
  title: string
  description: string
  sortOrder: number
  restDay: boolean
  estimatedDurationMinutes: number
  notes: string
  exercises: TrainingDayExercise[]
  restActivities: RestActivity[]
}

export interface TrainingPlan {
  id: number
  name: string
  description: string
  category: string
  difficulty: string
  startDate: string | null
  endDate: string | null
  active: boolean
  archived: boolean
  deletedAt: string | null
  purgeAt: string | null
  days: TrainingPlanDay[]
  createdAt: string
  updatedAt: string
}

export interface TrainingPlanInput {
  name: string
  description: string
  category: string
  difficulty: string
  startDate?: string | null
  endDate?: string | null
}

export interface TrainingPlanDayInput {
  title: string
  description: string
  restDay: boolean
  estimatedDurationMinutes: number
  notes: string
}

export interface SetLog {
  id: number
  setNumber: number
  reps: number
  load: number
  durationSeconds: number
  distance: number
  rpe: number | null
  completed: boolean
  completedAt: string | null
  manuallyAdded: boolean
  notes: string
  volume: number
}

export interface SetLogInput {
  reps: number
  load: number
  durationSeconds: number
  distance: number
  rpe: number | null
  completed: boolean
  notes: string
}

export interface SessionExercise {
  id: number
  exerciseDefinitionId: number
  name: string
  muscleGroup: string
  category: ExerciseCategory
  timed: boolean
  primaryVideoUrl: string | null
  primaryImageUrl: string | null
  primaryVideoSourceUrl: string | null
  primaryVideoLicenseName: string | null
  primaryVideoLicenseUrl: string | null
  primaryVideoAuthor: string | null
  attribution: string | null
  sortOrder: number
  plannedSets: number
  plannedMinReps: number
  plannedMaxReps: number
  plannedLoad: number | null
  plannedDurationSeconds: number | null
  plannedDistance: number | null
  restSeconds: number
  setType: SetType
  status: SessionExerciseStatus
  notes: string
  sets: SetLog[]
}

export interface WorkoutSession {
  id: number
  trainingPlanId: number
  planDayId: number
  workoutName: string
  dayName: string
  scheduledDate: string
  startedAt: string
  completedAt: string | null
  pausedAt: string | null
  pausedDurationSeconds: number
  status: SessionStatus
  totalDurationSeconds: number
  overallRpe: number | null
  notes: string
  completedSets: number
  totalPlannedSets: number
  totalVolume: number
  exercises: SessionExercise[]
}

export interface Dashboard {
  activePlanName: string | null
  nextWorkoutName: string | null
  nextPlanDayId: number | null
  completedSessions: number
  weeklySessions: number
  totalExercises: number
  totalDurationSeconds: number
  totalVolume: number
  adherence: number
  recentSessions: WorkoutSession[]
}

export interface AppSettings {
  key: string
  value: unknown
  updatedAt: string
}

export interface StartWorkoutSessionInput {
  trainingPlanId: number
  planDayId: number
  scheduledDate: string
}

export interface CompleteWorkoutSessionInput {
  overallRpe: number | null
  notes: string
}

export interface ExerciseLibraryQuery {
  query?: string
  muscle?: string
  equipment?: string
  category?: ExerciseCategory
  source?: ExerciseSource
  hasVideo?: boolean
  includeArchived?: boolean
}

export interface TrainingBackup {
  schemaVersion: 1 | 2
  appVersion: string
  exportedAt: string
  exercises: unknown[]
  media: unknown[]
  trainingPlans: unknown[]
  trainingPlanDays: unknown[]
  trainingDayExercises: unknown[]
  restActivities: unknown[]
  sessions: unknown[]
  sessionExercises: unknown[]
  setLogs: unknown[]
  settings: unknown[]
}
