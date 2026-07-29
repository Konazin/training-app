import AsyncStorage from '@react-native-async-storage/async-storage'
import type { RestTimerState } from '../features/workout-session/model/restTimer'

// AsyncStorage guarda apenas este estado transitório; os dados do treino vivem no SQLite.
const REST_TIMER_KEY = 'training:local-rest-timer'

export const restTimerStorage = {
  async get(sessionId: number) {
    const value = await AsyncStorage.getItem(REST_TIMER_KEY)
    if (!value) return null
    try {
      const timer = JSON.parse(value) as RestTimerState
      if (timer.sessionId === sessionId) return timer
    } catch {
      // Entrada transitória inválida pode ser descartada com segurança.
    }
    await AsyncStorage.removeItem(REST_TIMER_KEY)
    return null
  },
  set: (timer: RestTimerState) =>
    AsyncStorage.setItem(REST_TIMER_KEY, JSON.stringify(timer)),
  clear: () => AsyncStorage.removeItem(REST_TIMER_KEY),
}
