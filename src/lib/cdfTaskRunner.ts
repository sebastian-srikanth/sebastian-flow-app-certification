/**
 * Concurrency limiter for CDF API calls.
 *
 * Data-modeling concurrency limits are applied **project-wide, not per client**: the
 * documented default for instance query operations is 8, and transformations may consume
 * up to 75% of that budget, leaving as little as 2 for interactive clients
 * (https://docs.cognite.com/cdf/dm/dm_reference/dm_limits_and_restrictions#api-concurrency-limits).
 *
 * Opening an asset fans out four panel queries at once and the time-series discovery
 * pages sequentially, so without a limiter this app can burst well past its share and
 * take 429s. `dm-limits-and-best-practices` makes wrapping CDF calls in a scheduler a
 * checklist item; this is that scheduler.
 */

/** Deliberately below the documented budget of 8 to leave room for other CDF clients. */
export const MAX_CONCURRENT_CDF_REQUESTS = 4;

type PendingTask<T> = {
  run: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (reason: unknown) => void;
};

export class QueuedTaskRunner {
  private readonly queue: Array<PendingTask<unknown>> = [];
  private running = 0;

  constructor(private readonly maxConcurrentTasks: number = MAX_CONCURRENT_CDF_REQUESTS) {}

  /** Queues `run` and resolves with its result once a slot is free. */
  schedule<T>(run: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queue.push({
        run: run as () => Promise<unknown>,
        resolve: resolve as (value: unknown) => void,
        reject,
      });
      this.drain();
    });
  }

  /** Number of tasks waiting for a slot. Used by tests to assert queueing happens. */
  get pendingCount(): number {
    return this.queue.length;
  }

  /** Number of tasks currently in flight. */
  get runningCount(): number {
    return this.running;
  }

  private drain(): void {
    while (this.running < this.maxConcurrentTasks && this.queue.length > 0) {
      const task = this.queue.shift();
      if (!task) return;

      this.running += 1;
      void (async () => {
        try {
          task.resolve(await task.run());
        } catch (error) {
          task.reject(error);
        } finally {
          this.running -= 1;
          this.drain();
        }
      })();
    }
  }
}

/** Shared runner for every CDF request the application makes. */
export const cdfTaskRunner = new QueuedTaskRunner();
