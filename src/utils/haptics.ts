/**
 * haptics.ts: small vibration feedback, the way native apps do it
 * (selection ticks, success/warning buzz). Errors are ignored: haptics are a
 * nice-to-have and some devices don't support them.
 */
import * as Haptics from 'expo-haptics';

export const haptics = {
  selection: () => Haptics.selectionAsync().catch(() => undefined),
  light: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined),
  success: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined),
  warning: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => undefined),
};
