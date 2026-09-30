/**
 * Run one full /extract pipeline at a time so heavy bundles do not wedge the service.
 */

let active = 0;
const waiters = [];

export function getExtractQueueStatus() {
  return { active, queued: waiters.length };
}

function releaseSlot() {
  active = Math.max(0, active - 1);
  const next = waiters.shift();
  if (next) next();
}

/**
 * @template T
 * @param {() => Promise<T>} fn
 * @returns {Promise<T>}
 */
export function runExtractExclusive(fn) {
  return new Promise((resolve, reject) => {
    const run = async () => {
      active += 1;
      try {
        resolve(await fn());
      } catch (error) {
        reject(error);
      } finally {
        releaseSlot();
      }
    };

    if (active === 0) {
      run();
      return;
    }

    waiters.push(run);
  });
}
