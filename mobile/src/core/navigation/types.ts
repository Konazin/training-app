import type { NavigatorScreenParams } from '@react-navigation/native'

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
  Exercise: { destination?: 'workout' | 'plan' } | undefined
  Session: undefined
}
