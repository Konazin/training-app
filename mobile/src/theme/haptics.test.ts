import { describe, expect, it, vi } from 'vitest'

vi.mock('expo-haptics', () => ({
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning' },
  selectionAsync: vi.fn(async () => undefined),
  impactAsync: vi.fn(async () => undefined),
  notificationAsync: vi.fn(async () => undefined),
}))

import { triggerHaptic, type HapticsAdapter } from './haptics'

function adapter(): HapticsAdapter {
  return {
    selectionAsync: vi.fn(async () => undefined),
    impactAsync: vi.fn(async () => undefined),
    notificationAsync: vi.fn(async () => undefined),
  }
}

describe('feedback tátil', () => {
  it('não chama o dispositivo quando desativado', async () => {
    const target = adapter()
    await triggerHaptic('SET_COMPLETE', false, target)
    expect(target.selectionAsync).not.toHaveBeenCalled()
    expect(target.impactAsync).not.toHaveBeenCalled()
    expect(target.notificationAsync).not.toHaveBeenCalled()
  })

  it('usa seleção, impacto e notificação de forma contida', async () => {
    const target = adapter()
    await triggerHaptic('THEME_SELECT', true, target)
    await triggerHaptic('SET_COMPLETE', true, target)
    await triggerHaptic('REST_TIMER_COMPLETE', true, target)
    await triggerHaptic('SESSION_COMPLETE', true, target)
    expect(target.selectionAsync).toHaveBeenCalledTimes(1)
    expect(target.impactAsync).toHaveBeenCalledTimes(1)
    expect(target.notificationAsync).toHaveBeenCalledTimes(2)
  })

  it('isola falhas nativas', async () => {
    const target = adapter()
    vi.mocked(target.impactAsync).mockRejectedValueOnce(new Error('sem motor tátil'))
    await expect(triggerHaptic('SESSION_PAUSE', true, target)).resolves.toBeUndefined()
    vi.mocked(target.notificationAsync).mockRejectedValueOnce(new Error('sem vibração'))
    await expect(triggerHaptic('REST_TIMER_COMPLETE', true, target)).resolves.toBeUndefined()
  })
})
