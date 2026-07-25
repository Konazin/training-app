import { adjustRestTimer, type RestTimerState } from './workoutSession'

const paused: RestTimerState = {
  sessionId: 1,
  exerciseId: 2,
  setId: 3,
  endsAt: 20_000,
  paused: true,
  pausedAt: 10_000,
}

assert(adjustRestTimer(paused, 15, 90_000).endsAt === 35_000, '+15 deve usar pausedAt')
assert(adjustRestTimer(paused, -15, 90_000).endsAt === 10_000, '-15 deve parar em pausedAt')

const adjusted = adjustRestTimer(paused, 15, 90_000)
const resumedAt = 50_000
const resumedEndsAt = adjusted.endsAt + resumedAt - paused.pausedAt!
assert(resumedEndsAt - resumedAt === 25_000, 'retomar deve preservar o tempo restante')

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message)
}
