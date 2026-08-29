// ┌─────────────────────────────────┐ \\
// │ Copyright © 2026 Ioannis Nezis  │ \\
// ├─────────────────────────────────┤ \\
// │ Licensed under the MIT license. │ \\
// └─────────────────────────────────┘ \\

/**
 * Startup timing instrumentation.
 *
 * Uses the User Timing API, so every step also shows up as a measure in the
 * browser devtools performance panel, and logs each step to `console.debug`.
 * All timestamps are relative to `performance.timeOrigin` (page load).
 */

const steps: { name: string; duration: number; at: number }[] = [];
let previous = 0;

/** Records the end of an initialization step, measured from the previous one. */
export function initStep(name: string) {
  const at = performance.now();
  const duration = at - previous;
  performance.measure(`init: ${name}`, { start: previous, end: at });
  steps.push({ name, duration, at });
  previous = at;
  console.debug(`[init] ${name}: ${duration.toFixed(1)}ms (t+${at.toFixed(1)}ms)`);
}

/** Records the last step and logs a summary table of the whole startup. */
export function initDone() {
  initStep('remove loading screen');
  console.debug(`[init] fully operational after ${previous.toFixed(1)}ms`);
  console.table(
    steps.map(({ name, duration, at }) => ({
      step: name,
      'duration (ms)': Number(duration.toFixed(1)),
      'since page load (ms)': Number(at.toFixed(1)),
    }))
  );
}
