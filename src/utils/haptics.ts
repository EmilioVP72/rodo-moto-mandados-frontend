/**
 * Safe Vibration API wrapper for mobile haptic feedback.
 * Silently no-ops on unsupported browsers or desktop devices.
 */

export function triggerHaptic(pattern: number | number[]): void {
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(pattern);
    }
  } catch {
    // Ignore unsupported or blocked vibration calls
  }
}

export function vibrateLight(): void {
  triggerHaptic(18);
}

export function vibrateSuccess(): void {
  triggerHaptic([25, 35, 30]);
}

export function vibrateOrderComplete(): void {
  triggerHaptic([40, 50, 70]);
}
