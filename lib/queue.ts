export interface InferenceTaskOptions {
  timeoutMs?: number;
  priority?: number;
  signal?: AbortSignal;
}

export interface QueueStatus {
  isRunning: boolean;
  queueLength: number;
  activeTaskName?: string;
}

export interface IInferenceQueue {
  enqueue<T>(
    taskName: string,
    execute: (signal: AbortSignal) => Promise<T>,
    options?: InferenceTaskOptions
  ): Promise<T>;
  getStatus(): QueueStatus;
}

class LocalInferenceQueue implements IInferenceQueue {
  private queue: Array<{
    taskName: string;
    execute: (signal: AbortSignal) => Promise<unknown>;
    resolve: (value: any) => void;
    reject: (reason?: any) => void;
    options?: InferenceTaskOptions;
  }> = [];

  private isProcessing = false;
  private currentTaskName?: string;
  private currentAbortController?: AbortController;

  public async enqueue<T>(
    taskName: string,
    execute: (signal: AbortSignal) => Promise<T>,
    options?: InferenceTaskOptions
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queue.push({
        taskName,
        execute: execute as (signal: AbortSignal) => Promise<unknown>,
        resolve,
        reject,
        options,
      });

      this.processNext();
    });
  }

  public getStatus(): QueueStatus {
    return {
      isRunning: this.isProcessing,
      queueLength: this.queue.length,
      activeTaskName: this.currentTaskName,
    };
  }

  private async processNext(): Promise<void> {
    if (this.isProcessing) return;
    if (this.queue.length === 0) {
      this.currentTaskName = undefined;
      return;
    }

    const item = this.queue.shift();
    if (!item) return;

    this.isProcessing = true;
    this.currentTaskName = item.taskName;

    const abortController = new AbortController();
    this.currentAbortController = abortController;

    const timeoutMs = item.options?.timeoutMs ?? 180000; // 3 minute default for vision inference
    let timeoutId: NodeJS.Timeout | undefined;

    if (timeoutMs > 0) {
      timeoutId = setTimeout(() => {
        abortController.abort(new Error(`Inference task "${item.taskName}" timed out after ${timeoutMs}ms`));
      }, timeoutMs);
    }

    // Forward external signal cancellation if provided
    let externalSignalHandler: (() => void) | undefined;
    if (item.options?.signal) {
      if (item.options.signal.aborted) {
        abortController.abort(item.options.signal.reason);
      } else {
        externalSignalHandler = () => {
          abortController.abort(item.options?.signal?.reason);
        };
        item.options.signal.addEventListener('abort', externalSignalHandler);
      }
    }

    try {
      const result = await item.execute(abortController.signal);
      item.resolve(result);
    } catch (err) {
      item.reject(err);
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
      if (item.options?.signal && externalSignalHandler) {
        item.options.signal.removeEventListener('abort', externalSignalHandler);
      }
      this.currentAbortController = undefined;
      this.currentTaskName = undefined;
      this.isProcessing = false;

      // Continue queue asynchronously
      setImmediate(() => this.processNext());
    }
  }
}

// Global singleton instance
declare global {
  // eslint-disable-next-line no-var
  var __inferenceQueue: IInferenceQueue | undefined;
}

export const inferenceQueue: IInferenceQueue =
  global.__inferenceQueue || (global.__inferenceQueue = new LocalInferenceQueue());

export default inferenceQueue;
