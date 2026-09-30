/**
 * @returns {number}
 */
export function startTimer() {
  return Date.now();
}

function elapsedMs(startedAt) {
  return Date.now() - startedAt;
}

/**
 * @param {Record<string, number>} timing
 * @param {string} phase
 * @param {number} startedAt
 */
export function recordPhase(timing, phase, startedAt) {
  timing[phase] = elapsedMs(startedAt);
}
