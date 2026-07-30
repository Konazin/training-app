import {
  applyMedia,
  isStringArray,
  parseJson,
  setVolume,
  type ExerciseDefinition,
  type ExerciseMedia,
  type RestActivity,
  type SessionExercise,
  type SetLog,
  type TrainingDayExercise,
  type TrainingPlan,
  type TrainingPlanDay,
  type WorkoutSession,
} from '@training/training-domain'

export type Row = Record<string, string | number | null>
type Cell = string | number | null | undefined
const bool = (value: Cell) => value === 1
const num = (value: Cell) => Number(value ?? 0)
const text = (value: Cell) => String(value ?? '')

export function mapMedia(row: Row): ExerciseMedia {
  const localUri = row.local_uri ? text(row.local_uri) : null
  const remoteUrl = row.remote_url ? text(row.remote_url) : null
  const thumbnailLocalUri = row.thumbnail_local_uri ? text(row.thumbnail_local_uri) : null
  const thumbnailRemoteUrl = row.thumbnail_remote_url ? text(row.thumbnail_remote_url) : null
  return {
    id: num(row.id),
    exerciseDefinitionId: num(row.exercise_definition_id),
    type: text(row.type) as ExerciseMedia['type'],
    source: localUri?.startsWith('placeholder://')
      ? 'BUNDLED'
      : text(row.source) as ExerciseMedia['source'],
    externalId: row.external_id ? text(row.external_id) : null,
    remoteUrl,
    localUri,
    thumbnailRemoteUrl,
    thumbnailLocalUri,
    mimeType: row.mime_type ? text(row.mime_type) : null,
    width: row.width == null ? null : num(row.width),
    height: row.height == null ? null : num(row.height),
    durationSeconds: row.duration_seconds == null ? null : num(row.duration_seconds),
    main: bool(row.is_main),
    sortOrder: num(row.sort_order),
    licenseName: row.license_name ? text(row.license_name) : null,
    licenseUrl: row.license_url ? text(row.license_url) : null,
    author: row.author ? text(row.author) : null,
    sourceUrl: row.source_url ? text(row.source_url) : null,
    downloadedAt: row.downloaded_at ? text(row.downloaded_at) : null,
    createdAt: text(row.created_at),
    updatedAt: text(row.updated_at),
    url: localUri ?? remoteUrl ?? '',
    thumbnailUrl: thumbnailLocalUri ?? thumbnailRemoteUrl,
  }
}

export function mapExercise(row: Row, media: ExerciseMedia[], aliases: string[] = []): ExerciseDefinition {
  const source = text(row.resolved_source || row.source) as ExerciseDefinition['source']
  return applyMedia({
    id: num(row.id),
    name: text(row.name),
    normalizedName: text(row.normalized_name),
    description: text(row.description),
    primaryMuscleGroup: text(row.primary_muscle_group),
    secondaryMuscleGroups: parseJson(text(row.secondary_muscle_groups_json), isStringArray),
    equipment: text(row.equipment),
    category: text(row.category) as ExerciseDefinition['category'],
    difficulty: text(row.difficulty),
    instructions: text(row.instructions),
    notes: text(row.notes),
    unilateral: bool(row.unilateral),
    timed: bool(row.timed),
    source,
    externalId: row.catalog_external_id
      ? text(row.catalog_external_id)
      : row.external_id ? text(row.external_id) : null,
    sourceUrl: row.source_url ? text(row.source_url) : null,
    licenseName: row.license_name ? text(row.license_name) : null,
    licenseUrl: row.license_url ? text(row.license_url) : null,
    author: row.author ? text(row.author) : null,
    archived: bool(row.archived),
    createdAt: text(row.created_at),
    updatedAt: text(row.updated_at),
    media,
    custom: source === 'CUSTOM',
    mediaUrl: media[0]?.url ?? '',
    aliases,
    favorite: bool(row.favorite),
    lastUsedAt: row.last_used_at ? text(row.last_used_at) : null,
    useCount: num(row.use_count),
  })
}

export function mapRestActivity(row: Row): RestActivity {
  return {
    id: num(row.id), name: text(row.name), description: text(row.description),
    estimatedDurationMinutes: num(row.estimated_duration_minutes), category: text(row.category),
    optional: bool(row.optional), sortOrder: num(row.sort_order),
  }
}

export function mapDayExercise(row: Row, exercise: ExerciseDefinition): TrainingDayExercise {
  return {
    id: num(row.id), exercise, sortOrder: num(row.sort_order), sets: num(row.sets),
    minReps: num(row.min_reps), maxReps: num(row.max_reps),
    plannedLoad: row.planned_load == null ? null : num(row.planned_load),
    plannedDurationSeconds: row.planned_duration_seconds == null ? null : num(row.planned_duration_seconds),
    plannedDistance: row.planned_distance == null ? null : num(row.planned_distance),
    restSeconds: num(row.rest_seconds),
    plannedRpe: row.planned_rpe == null ? null : num(row.planned_rpe),
    setType: text(row.set_type) as TrainingDayExercise['setType'],
    notes: text(row.notes),
    alternativeExerciseId: row.alternative_exercise_id == null ? null : num(row.alternative_exercise_id),
  }
}

export function mapPlan(row: Row, days: TrainingPlanDay[]): TrainingPlan {
  return {
    id: num(row.id), name: text(row.name), description: text(row.description),
    category: text(row.category), difficulty: text(row.difficulty),
    startDate: row.start_date ? text(row.start_date) : null,
    endDate: row.end_date ? text(row.end_date) : null,
    active: bool(row.active), archived: bool(row.archived),
    deletedAt: row.deleted_at ? text(row.deleted_at) : null,
    purgeAt: row.purge_at ? text(row.purge_at) : null,
    days,
    createdAt: text(row.created_at), updatedAt: text(row.updated_at),
  }
}

export function mapSet(row: Row): SetLog {
  const result: SetLog = {
    id: num(row.id), setNumber: num(row.set_number), reps: num(row.reps), load: num(row.load),
    durationSeconds: num(row.duration_seconds), distance: num(row.distance),
    rpe: row.rpe == null ? null : num(row.rpe), completed: bool(row.completed),
    completedAt: row.completed_at ? text(row.completed_at) : null,
    manuallyAdded: bool(row.manually_added), notes: text(row.notes), volume: 0,
  }
  result.volume = setVolume(result)
  return result
}

export function mapSessionExercise(row: Row, sets: SetLog[]): SessionExercise {
  return {
    id: num(row.id), exerciseDefinitionId: num(row.exercise_definition_id), name: text(row.name),
    muscleGroup: text(row.muscle_group), category: text(row.category) as SessionExercise['category'],
    timed: bool(row.timed), primaryVideoUrl: row.primary_video_url ? text(row.primary_video_url) : null,
    primaryImageUrl: row.primary_image_url ? text(row.primary_image_url) : null,
    primaryVideoSourceUrl: row.primary_video_source_url ? text(row.primary_video_source_url) : null,
    primaryVideoLicenseName: row.primary_video_license_name ? text(row.primary_video_license_name) : null,
    primaryVideoLicenseUrl: row.primary_video_license_url ? text(row.primary_video_license_url) : null,
    primaryVideoAuthor: row.primary_video_author ? text(row.primary_video_author) : null,
    attribution: row.attribution ? text(row.attribution) : null,
    sortOrder: num(row.sort_order), plannedSets: num(row.planned_sets),
    plannedMinReps: num(row.planned_min_reps), plannedMaxReps: num(row.planned_max_reps),
    plannedLoad: row.planned_load == null ? null : num(row.planned_load),
    plannedDurationSeconds: row.planned_duration_seconds == null ? null : num(row.planned_duration_seconds),
    plannedDistance: row.planned_distance == null ? null : num(row.planned_distance),
    restSeconds: num(row.rest_seconds), setType: text(row.set_type) as SessionExercise['setType'],
    status: text(row.status) as SessionExercise['status'], notes: text(row.notes),
    userNotes: text(row.user_notes),
    substituteExerciseDefinitionId: row.substitute_exercise_definition_id == null
      ? null
      : num(row.substitute_exercise_definition_id),
    substituteName: row.substitute_name ? text(row.substitute_name) : null,
    substitutionReason: row.substitution_reason ? text(row.substitution_reason) : null,
    sets,
  }
}

export function mapSession(row: Row, exercises: SessionExercise[]): WorkoutSession {
  const completedSets = exercises.flatMap((item) => item.sets).filter((item) => item.completed).length
  const totalVolume = exercises.flatMap((item) => item.sets).reduce((sum, item) => sum + item.volume, 0)
  return {
    id: num(row.id), trainingPlanId: num(row.training_plan_id), planDayId: num(row.plan_day_id),
    workoutName: text(row.workout_name), dayName: text(row.day_name),
    scheduledDate: text(row.scheduled_date), startedAt: text(row.started_at),
    completedAt: row.completed_at ? text(row.completed_at) : null,
    pausedAt: row.paused_at ? text(row.paused_at) : null,
    pausedDurationSeconds: num(row.paused_duration_seconds),
    status: text(row.status) as WorkoutSession['status'],
    totalDurationSeconds: num(row.total_duration_seconds),
    overallRpe: row.overall_rpe == null ? null : num(row.overall_rpe),
    notes: text(row.notes), completedSets,
    totalPlannedSets: exercises.reduce((sum, item) => sum + item.plannedSets, 0),
    totalVolume, exercises,
  }
}
