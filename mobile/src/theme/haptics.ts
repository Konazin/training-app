import * as Haptics from 'expo-haptics'

export type HapticEvent =
  | 'THEME_SELECT'
  | 'SET_COMPLETE'
  | 'SESSION_START'
  | 'SESSION_PAUSE'
  | 'SESSION_RESUME'
  | 'SESSION_COMPLETE'
  | 'DESTRUCTIVE_CONFIRM'

export interface HapticsAdapter {
  selectionAsync(): Promise<void>
  impactAsync(style: Haptics.ImpactFeedbackStyle): Promise<void>
  notificationAsync(type: Haptics.NotificationFeedbackType): Promise<void>
}

const nativeHaptics: HapticsAdapter = Haptics

export async function triggerHaptic(
  event: HapticEvent,
  enabled: boolean,
  adapter: HapticsAdapter = nativeHaptics,
): Promise<void> {
  if (!enabled) return
  try {
    if (event === 'THEME_SELECT') await adapter.selectionAsync()
    else if (event === 'SESSION_COMPLETE') {
      await adapter.notificationAsync(Haptics.NotificationFeedbackType.Success)
    } else if (event === 'DESTRUCTIVE_CONFIRM') {
      await adapter.notificationAsync(Haptics.NotificationFeedbackType.Warning)
    } else {
      await adapter.impactAsync(
        event === 'SET_COMPLETE'
          ? Haptics.ImpactFeedbackStyle.Medium
          : Haptics.ImpactFeedbackStyle.Light,
      )
    }
  } catch {
    // Feedback tátil nunca pode impedir a ação principal.
  }
}
