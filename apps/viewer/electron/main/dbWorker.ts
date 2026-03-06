/**
 * Lightweight message-passing wrapper around a `worker_threads` Worker.
 *
 * The main process sends `{ id, method, args }` messages to the worker and
 * receives `{ id, result?, error? }` responses as Promises. This keeps all
 * synchronous `better-sqlite3` and heavy file-I/O off the main thread so
 * native dialogs and window management stay responsive.
 */

import { Worker } from "worker_threads";
import type { ElectronPaths } from "./electronPaths.js";

interface PendingRequest {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
}

interface WorkerResponse {
  id: number;
  result?: unknown;
  error?: string;
}

export class DbWorker {
  private worker: Worker;
  private pending = new Map<number, PendingRequest>();
  private nextId = 0;

  constructor(workerPath: string, paths: ElectronPaths) {
    this.worker = new Worker(workerPath, { workerData: paths });

    this.worker.on("message", (msg: WorkerResponse) => {
      const p = this.pending.get(msg.id);
      if (!p) return;
      this.pending.delete(msg.id);
      if (msg.error) {
        p.reject(new Error(msg.error));
      } else {
        p.resolve(msg.result);
      }
    });

    this.worker.on("error", (err) => {
      for (const p of this.pending.values()) {
        p.reject(err);
      }
      this.pending.clear();
    });
  }

  request<T>(method: string, ...args: unknown[]): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const id = this.nextId++;
      this.pending.set(id, {
        resolve: resolve as (v: unknown) => void,
        reject,
      });
      this.worker.postMessage({ id, method, args });
    });
  }

  terminate(): Promise<number> {
    return this.worker.terminate();
  }
}
