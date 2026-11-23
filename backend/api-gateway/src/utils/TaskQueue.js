/**
 * In-process FIFO queue with bounded concurrency.
 * GPU inference is memory-bound, so jobs run with a small fixed concurrency.
 * Replace with BullMQ/Redis for multi-instance deployments; the interface stays the same.
 */
export class TaskQueue {
  constructor({ concurrency = 1, onError = () => {} } = {}) {
    this.concurrency = concurrency;
    this.onError = onError;
    this.pending = [];
    this.running = 0;
    this.idleWaiters = [];
  }

  get size() {
    return this.pending.length;
  }

  push(task) {
    this.pending.push(task);
    this.#drain();
  }

  /** Resolves once no tasks are pending or running (useful for tests and shutdown). */
  onIdle() {
    if (this.running === 0 && this.pending.length === 0) return Promise.resolve();
    return new Promise((resolve) => this.idleWaiters.push(resolve));
  }

  #drain() {
    while (this.running < this.concurrency && this.pending.length > 0) {
      const task = this.pending.shift();
      this.running += 1;
      Promise.resolve()
        .then(task)
        .catch(this.onError)
        .finally(() => {
          this.running -= 1;
          this.#drain();
          this.#notifyIdle();
        });
    }
  }

  #notifyIdle() {
    if (this.running > 0 || this.pending.length > 0) return;
    this.idleWaiters.splice(0).forEach((resolve) => resolve());
  }
}
