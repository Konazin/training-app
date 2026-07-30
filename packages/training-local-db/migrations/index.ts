import type { SqlDatabase } from '../database'

export interface Migration {
  version: number
  name: string
  sql: string
  checksum: string
}

export interface MigrationProgress {
  version: number
  name: string
  current: number
  total: number
}

const schema = `
CREATE TABLE exercise_definitions (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  normalized_name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  primary_muscle_group TEXT NOT NULL,
  secondary_muscle_groups_json TEXT NOT NULL DEFAULT '[]',
  equipment TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('STRENGTH','HYPERTROPHY','ENDURANCE','CARDIO','MOBILITY','STRETCHING','TECHNIQUE','RECOVERY')),
  difficulty TEXT NOT NULL,
  instructions TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  unilateral INTEGER NOT NULL DEFAULT 0 CHECK (unilateral IN (0,1)),
  timed INTEGER NOT NULL DEFAULT 0 CHECK (timed IN (0,1)),
  source TEXT NOT NULL CHECK (source IN ('SYSTEM','CUSTOM','WGER')),
  external_id TEXT,
  source_url TEXT,
  license_name TEXT,
  license_url TEXT,
  author TEXT,
  archived INTEGER NOT NULL DEFAULT 0 CHECK (archived IN (0,1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(source, external_id)
);

CREATE TABLE exercise_media (
  id INTEGER PRIMARY KEY,
  exercise_definition_id INTEGER NOT NULL REFERENCES exercise_definitions(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('IMAGE','VIDEO')),
  source TEXT NOT NULL CHECK (source IN ('SYSTEM','CUSTOM','WGER','LEGACY')),
  external_id TEXT,
  remote_url TEXT,
  local_uri TEXT,
  thumbnail_remote_url TEXT,
  thumbnail_local_uri TEXT,
  mime_type TEXT,
  width INTEGER,
  height INTEGER,
  duration_seconds INTEGER,
  is_main INTEGER NOT NULL DEFAULT 0 CHECK (is_main IN (0,1)),
  sort_order INTEGER NOT NULL DEFAULT 0,
  license_name TEXT,
  license_url TEXT,
  author TEXT,
  source_url TEXT,
  downloaded_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE training_plans (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL,
  difficulty TEXT NOT NULL,
  start_date TEXT,
  end_date TEXT,
  active INTEGER NOT NULL DEFAULT 0 CHECK (active IN (0,1)),
  archived INTEGER NOT NULL DEFAULT 0 CHECK (archived IN (0,1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE UNIQUE INDEX one_active_training_plan
  ON training_plans(active) WHERE active = 1;

CREATE TABLE training_plan_days (
  id INTEGER PRIMARY KEY,
  training_plan_id INTEGER NOT NULL REFERENCES training_plans(id) ON DELETE CASCADE,
  weekday TEXT NOT NULL CHECK (weekday IN ('MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY','SUNDAY')),
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL,
  rest_day INTEGER NOT NULL DEFAULT 0 CHECK (rest_day IN (0,1)),
  estimated_duration_minutes INTEGER NOT NULL DEFAULT 0,
  notes TEXT NOT NULL DEFAULT '',
  UNIQUE(training_plan_id, weekday)
);

CREATE TABLE training_day_exercises (
  id INTEGER PRIMARY KEY,
  training_plan_day_id INTEGER NOT NULL REFERENCES training_plan_days(id) ON DELETE CASCADE,
  exercise_definition_id INTEGER NOT NULL REFERENCES exercise_definitions(id),
  sort_order INTEGER NOT NULL,
  sets INTEGER NOT NULL CHECK (sets > 0),
  min_reps INTEGER NOT NULL DEFAULT 0 CHECK (min_reps >= 0),
  max_reps INTEGER NOT NULL DEFAULT 0 CHECK (max_reps >= min_reps),
  planned_load REAL,
  planned_duration_seconds INTEGER,
  planned_distance REAL,
  rest_seconds INTEGER NOT NULL DEFAULT 0 CHECK (rest_seconds >= 0),
  planned_rpe REAL,
  set_type TEXT NOT NULL CHECK (set_type IN ('NORMAL','WARM_UP','DROP_SET','BI_SET','CIRCUIT','TO_FAILURE','CONTROLLED_TEMPO')),
  notes TEXT NOT NULL DEFAULT '',
  alternative_exercise_id INTEGER REFERENCES exercise_definitions(id),
  UNIQUE(training_plan_day_id, sort_order)
);

CREATE TABLE rest_activities (
  id INTEGER PRIMARY KEY,
  training_plan_day_id INTEGER NOT NULL REFERENCES training_plan_days(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  estimated_duration_minutes INTEGER NOT NULL DEFAULT 0,
  category TEXT NOT NULL,
  optional INTEGER NOT NULL DEFAULT 0 CHECK (optional IN (0,1)),
  sort_order INTEGER NOT NULL,
  UNIQUE(training_plan_day_id, sort_order)
);

CREATE TABLE workout_sessions (
  id INTEGER PRIMARY KEY,
  training_plan_id INTEGER NOT NULL,
  plan_day_id INTEGER NOT NULL,
  workout_name TEXT NOT NULL,
  day_name TEXT NOT NULL,
  scheduled_date TEXT NOT NULL,
  started_at TEXT NOT NULL,
  completed_at TEXT,
  paused_at TEXT,
  paused_duration_seconds INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL CHECK (status IN ('IN_PROGRESS','PAUSED','COMPLETED','ABANDONED')),
  active_slot INTEGER UNIQUE CHECK (active_slot IS NULL OR active_slot = 1),
  total_duration_seconds INTEGER NOT NULL DEFAULT 0,
  overall_rpe REAL,
  notes TEXT NOT NULL DEFAULT ''
);

CREATE TABLE workout_session_exercises (
  id INTEGER PRIMARY KEY,
  workout_session_id INTEGER NOT NULL REFERENCES workout_sessions(id) ON DELETE CASCADE,
  exercise_definition_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  muscle_group TEXT NOT NULL,
  category TEXT NOT NULL,
  timed INTEGER NOT NULL CHECK (timed IN (0,1)),
  primary_video_url TEXT,
  primary_image_url TEXT,
  primary_video_source_url TEXT,
  primary_video_license_name TEXT,
  primary_video_license_url TEXT,
  primary_video_author TEXT,
  attribution TEXT,
  sort_order INTEGER NOT NULL,
  planned_sets INTEGER NOT NULL,
  planned_min_reps INTEGER NOT NULL,
  planned_max_reps INTEGER NOT NULL,
  planned_load REAL,
  planned_duration_seconds INTEGER,
  planned_distance REAL,
  rest_seconds INTEGER NOT NULL,
  set_type TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('PENDING','IN_PROGRESS','COMPLETED','SKIPPED')),
  notes TEXT NOT NULL DEFAULT '',
  UNIQUE(workout_session_id, sort_order)
);

CREATE TABLE workout_set_logs (
  id INTEGER PRIMARY KEY,
  workout_session_exercise_id INTEGER NOT NULL REFERENCES workout_session_exercises(id) ON DELETE CASCADE,
  set_number INTEGER NOT NULL,
  reps INTEGER NOT NULL DEFAULT 0,
  load REAL NOT NULL DEFAULT 0,
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  distance REAL NOT NULL DEFAULT 0,
  rpe REAL,
  completed INTEGER NOT NULL DEFAULT 0 CHECK (completed IN (0,1)),
  completed_at TEXT,
  manually_added INTEGER NOT NULL DEFAULT 0 CHECK (manually_added IN (0,1)),
  notes TEXT NOT NULL DEFAULT '',
  UNIQUE(workout_session_exercise_id, set_number)
);

CREATE TABLE app_settings (
  key TEXT PRIMARY KEY,
  value_json TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
`

const indexes = `
CREATE INDEX exercise_definition_search ON exercise_definitions(normalized_name, primary_muscle_group, equipment);
CREATE INDEX exercise_media_owner ON exercise_media(exercise_definition_id, type, is_main, sort_order);
CREATE INDEX training_day_plan ON training_plan_days(training_plan_id, sort_order);
CREATE INDEX session_history ON workout_sessions(started_at DESC);
CREATE INDEX session_exercise_owner ON workout_session_exercises(workout_session_id, sort_order);
CREATE INDEX set_log_owner ON workout_set_logs(workout_session_exercise_id, set_number);
`

const appMetadata = `
CREATE TABLE app_metadata (
  key TEXT PRIMARY KEY,
  value_json TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
`

const externalExerciseIndexes = `
CREATE UNIQUE INDEX exercise_media_source_external
  ON exercise_media(source, external_id)
  WHERE external_id IS NOT NULL;
CREATE INDEX exercise_definition_external_lookup
  ON exercise_definitions(source, external_id, archived);
`

export const MIGRATIONS: Migration[] = [
  migration(1, 'local_training_schema', schema),
  migration(2, 'local_query_indexes', indexes),
  migration(3, 'app_installation_metadata', appMetadata),
  migration(4, 'external_exercise_indexes', externalExerciseIndexes),
]

export async function runMigrations(database: SqlDatabase, onProgress?: (progress: MigrationProgress) => void) {
  await database.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      checksum TEXT NOT NULL,
      applied_at TEXT NOT NULL
    )
  `)
  const applied = await database.all<{ version: number; checksum: string }>(
    'SELECT version, checksum FROM schema_migrations ORDER BY version',
  )
  const checksums = new Map(applied.map((item) => [item.version, item.checksum]))
  for (const [index, item] of MIGRATIONS.entries()) {
    const known = checksums.get(item.version)
    if (known && known !== item.checksum) {
      throw new MigrationError(item, 'checksum diferente do registrado')
    }
    if (known) continue
    onProgress?.({ version: item.version, name: item.name, current: index + 1, total: MIGRATIONS.length })
    try {
      await database.transaction(async (transaction) => {
        await transaction.exec(item.sql)
        await transaction.run(
          'INSERT INTO schema_migrations(version, name, checksum, applied_at) VALUES (?, ?, ?, ?)',
          item.version,
          item.name,
          item.checksum,
          new Date().toISOString(),
        )
      })
    } catch (cause) {
      throw new MigrationError(item, cause instanceof Error ? cause.message : String(cause))
    }
  }
}

export class MigrationError extends Error {
  constructor(public readonly migration: Migration, reason: string) {
    super(`Migration ${migration.version} (${migration.name}) falhou: ${reason}`)
    this.name = 'MigrationError'
  }
}

function migration(version: number, name: string, sql: string): Migration {
  return { version, name, sql: sql.trim(), checksum: checksum(sql.trim()) }
}

function checksum(value: string) {
  let hash = 0x811c9dc5
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0).toString(16).padStart(8, '0')
}
