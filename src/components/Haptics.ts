/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

class HapticsEngine {
  private enabled: boolean = true;

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  vibrate(pattern: number | number[]) {
    if (!this.enabled) return;
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate(pattern);
      } catch (e) {
        // Safe fail-silent if vibrating throws (e.g., in some iframe sandboxes)
      }
    }
  }

  vibrateLight() {
    this.vibrate(15);
  }

  vibrateMedium() {
    this.vibrate(40);
  }

  vibrateSuccess() {
    this.vibrate([40, 40, 100]);
  }

  vibrateError() {
    this.vibrate([80, 50, 80]);
  }
}

export const haptics = new HapticsEngine();
