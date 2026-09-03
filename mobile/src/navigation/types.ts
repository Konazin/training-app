import type { NavigatorScreenParams } from '@react-navigation/native'
import type { ExerciseProviderId } from '@training/training-domain'

export type MainTabParamList = {
  Today: undefined
  Plan: undefined
  History: undefined
  More: undefined
  Nutrition: undefined
}

export type RootStackParamList = {
  MainTabs: NavigatorScreenParams<MainTabParamList> | undefined
  Library: undefined
  ExerciseDetail: { exerciseId: number }
  Integrations: undefined
  WgerIntegration: { providerId: ExerciseProviderId }
  AppearanceSettings: undefined
  NutritionGoals: undefined
  Session: undefined
  ArchivedTrainingPlans: undefined
  TrainingPlanTrash: undefined
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
