import AsyncStorage from '@react-native-async-storage/async-storage'
import type { RestTimerState } from '../model/workoutSession'

const REST_TIMER_KEY = 'training:rest-timer'

export const workoutSessionStorage = {
  async getRestTimer() {
    const value = await AsyncStorage.getItem(REST_TIMER_KEY)
    if (!value) return null
    try {
      return JSON.parse(value) as RestTimerState
    } catch {
      await AsyncStorage.removeItem(REST_TIMER_KEY)
      return null
    }
  },
  setRestTimer: (timer: RestTimerState) =>
    AsyncStorage.setItem(REST_TIMER_KEY, JSON.stringify(timer)),
  clearRestTimer: () => AsyncStorage.removeItem(REST_TIMER_KEY),
}
