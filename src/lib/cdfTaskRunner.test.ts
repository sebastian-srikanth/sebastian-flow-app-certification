import { describe, expect, it, vi } from 'vitest';

import { MAX_CONCURRENT_CDF_REQUESTS, QueuedTaskRunner, cdfTaskRunner } from './cdfTaskRunner';

function deferred<T>(): { promise: Promise<T>; resolve: (value: T) => void; reject: (reason: unknown) => void } {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('QueuedTaskRunner', () => {
  it('resolves with the task result', async () => {
    const runner = new QueuedTaskRunner(2);
    await expect(runner.schedule(() => Promise.resolve('done'))).resolves.toBe('done');
  });

  it('never runs more tasks concurrently than the configured limit', async () => {
    const runner = new QueuedTaskRunner(2);
    const gates = [deferred<number>(), deferred<number>(), deferred<number>()];
    let concurrent = 0;
    let peakConcurrent = 0;

    const results = gates.map((gate, index) =>
      runner.schedule(async () => {
        concurrent += 1;
        peakConcurrent = Math.max(peakConcurrent, concurrent);
        const value = await gate.promise;
        concurrent -= 1;
        return value + index;
      }),
    );

    await vi.waitFor(() => expect(runner.runningCount).toBe(2));
    expect(runner.pendingCount).toBe(1);

    gates.forEach((gate, index) => gate.resolve(index * 10));

    await expect(Promise.all(results)).resolves.toEqual([0, 11, 22]);
    expect(peakConcurrent).toBe(2);
    expect(runner.runningCount).toBe(0);
    expect(runner.pendingCount).toBe(0);
  });

  it('starts a queued task as soon as a running task settles', async () => {
    const runner = new QueuedTaskRunner(1);
    const first = deferred<string>();
    const secondStarted = vi.fn();

    const firstResult = runner.schedule(() => first.promise);
    const secondResult = runner.schedule(() => {
      secondStarted();
      return Promise.resolve('second');
    });

    await vi.waitFor(() => expect(runner.runningCount).toBe(1));
    expect(secondStarted).not.toHaveBeenCalled();

    first.resolve('first');

    await expect(firstResult).resolves.toBe('first');
    await expect(secondResult).resolves.toBe('second');
    expect(secondStarted).toHaveBeenCalledTimes(1);
  });

  it('rejects the caller and frees the slot when a task throws', async () => {
    const runner = new QueuedTaskRunner(1);

    await expect(runner.schedule(() => Promise.reject(new Error('boom')))).rejects.toThrow('boom');
    expect(runner.runningCount).toBe(0);

    // A failed task must not permanently consume the slot.
    await expect(runner.schedule(() => Promise.resolve('recovered'))).resolves.toBe('recovered');
  });

  it('propagates a synchronous throw from the task function', async () => {
    const runner = new QueuedTaskRunner(1);

    await expect(
      runner.schedule(() => {
        throw new Error('sync failure');
      }),
    ).rejects.toThrow('sync failure');
    expect(runner.runningCount).toBe(0);
  });

  it('exposes a shared runner capped below the documented CDF query budget of 8', () => {
    expect(MAX_CONCURRENT_CDF_REQUESTS).toBeLessThan(8);
    expect(cdfTaskRunner).toBeInstanceOf(QueuedTaskRunner);
  });
});
