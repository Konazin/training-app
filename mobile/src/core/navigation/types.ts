import type { NavigatorScreenParams } from '@react-navigation/native'

export type SessionOrigin = 'NORMAL' | 'UMAMUSUME'

export type MainTabParamList = {
  Today: undefined
  Plan: undefined
  History: undefined
  More: undefined
}

export type RootStackParamList = {
  MainTabs: NavigatorScreenParams<MainTabParamList> | undefined
  Workouts: undefined
  Library: undefined
  Exercise: undefined
  Session: { origin?: SessionOrigin } | undefined
  UmaCareer: undefined
  UmaCareerCreate: undefined
  UmaCareerHistory: { careerId: number }
  ArchivedTrainingPlans: undefined
  ExercisePicker: { planId: number; dayId: number }
  TrainingPlanEditor: { planId?: number } | undefined
  TrainingPlanDay: { planId: number; dayId: number }
  DayExerciseEditor: {
    planId: number
    dayId: number
    exerciseId?: number
    exerciseDefinitionId?: number
  }
  RestActivityEditor: { planId: number; dayId: number; activityId?: number }
}
