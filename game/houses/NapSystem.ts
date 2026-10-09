export const NAP_DURATION_MS = 15_000;

/** Small timed action module that can later grow into sleep/rest scheduling. */
export class NapSystem {
  private deadline = 0;

  get active() {
    return this.deadline > Date.now();
  }

  get remainingMs() {
    return this.active ? Math.max(0, this.deadline - Date.now()) : null;
  }

  start() {
    if (this.active) return false;
    this.deadline = Date.now() + NAP_DURATION_MS;
    return true;
  }

  /** Returns true exactly once when the real-time nap countdown finishes. */
  update(_deltaMs: number) {
    if (this.deadline === 0 || Date.now() < this.deadline) return false;
    this.deadline = 0;
    return true;
  }

  cancel() {
    this.deadline = 0;
  }
}
