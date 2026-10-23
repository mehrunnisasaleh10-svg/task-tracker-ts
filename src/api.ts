import type { Task, TaskId, Priority } from "./types";
import { toTaskId } from "./types";

export type TaskDraft = Readonly<{
  title: string;
  priority: Priority;
  tags: readonly string[];
}>;

export type TaskPage = Readonly<{ items: Task[]; nextCursor: string | null }>;
export type PaginationSimulation = Readonly<{
  pageSize?: number;
  overlap?: number;
  /** Cursors in this set always fail, allowing retry-exhaustion tests. */
  failCursors?: readonly string[];
  /** Cursors in this set fail once, simulating a transient flaky page. */
  failOnceCursors?: readonly string[];
}>;

export type TaskChanges = Partial<TaskDraft> & Readonly<{ completedAt?: Date | null }>;
export interface TaskApi {
  list(signal?: AbortSignal): Promise<Task[]>;
  add(draft: TaskDraft): Promise<Task>;
  update(id: TaskId, changes: TaskChanges): Promise<Task>;
  remove(id: TaskId): Promise<void>;
  fetchPage(cursor: string | null, signal?: AbortSignal): Promise<TaskPage>;
}

export function makeTask(draft: TaskDraft, id: string, now: Date = new Date()): Task {
  return Object.freeze({
    id: toTaskId(id),
    title: draft.title.trim(),
    priority: draft.priority,
    completedAt: null,
    createdAt: new Date(now.getTime()),
    tags: Object.freeze([...draft.tags]),
  });
}

/** Deterministic in-memory API; it intentionally does not call a real backend. */
export class SimulatedTaskApi implements TaskApi {
  private tasks: Task[];
  private sequence = 100;
  private readonly pageSize: number;
  private readonly overlap: number;
  private readonly failCursors: ReadonlySet<string>;
  private readonly failOnceCursors: Set<string>;

  constructor(
    seed: readonly Task[] = [],
    private readonly latencyMs = 40,
    pagination: PaginationSimulation = {},
  ) {
    this.tasks = [...seed];
    this.pageSize = Math.max(1, Math.floor(pagination.pageSize ?? 3));
    this.overlap = Math.max(0, Math.min(this.pageSize - 1, Math.floor(pagination.overlap ?? 1)));
    this.failCursors = new Set(pagination.failCursors ?? []);
    this.failOnceCursors = new Set(pagination.failOnceCursors ?? []);
  }

  private wait(signal?: AbortSignal): Promise<void> {
    return new Promise((resolve, reject) => {
      if (signal?.aborted) {
        reject(new DOMException("Request aborted", "AbortError"));
        return;
      }
      const timer = setTimeout(() => {
        signal?.removeEventListener("abort", onAbort);
        resolve();
      }, this.latencyMs);
      const onAbort = (): void => {
        clearTimeout(timer);
        signal?.removeEventListener("abort", onAbort);
        reject(new DOMException("Request aborted", "AbortError"));
      };
      signal?.addEventListener("abort", onAbort, { once: true });
    });
  }

  async list(signal?: AbortSignal): Promise<Task[]> {
    await this.wait(signal);
    return [...this.tasks];
  }

  async add(draft: TaskDraft): Promise<Task> {
    await this.wait();
    const task = makeTask(draft, `task-${this.sequence++}`);
    this.tasks = [...this.tasks, task];
    return task;
  }

  async update(id: TaskId, changes: TaskChanges): Promise<Task> {
    await this.wait();
    const old = this.tasks.find((task) => task.id === id);
    if (!old) throw new Error("Task not found.");
    const updated: Task = Object.freeze({
      ...old,
      ...(changes.title === undefined ? {} : { title: changes.title.trim() }),
      ...(changes.priority === undefined ? {} : { priority: changes.priority }),
      ...(changes.tags === undefined ? {} : { tags: Object.freeze([...changes.tags]) }),
      ...(changes.completedAt === undefined
        ? {}
        : {
            completedAt:
              changes.completedAt === null ? null : new Date(changes.completedAt.getTime()),
          }),
    });
    this.tasks = this.tasks.map((task) => (task.id === id ? updated : task));
    return updated;
  }

  async remove(id: TaskId): Promise<void> {
    await this.wait();
    this.tasks = this.tasks.filter((task) => task.id !== id);
  }

  async fetchPage(cursor: string | null, signal?: AbortSignal): Promise<TaskPage> {
    await this.wait(signal);
    const start = cursor === null ? 0 : Number(cursor);
    if (!Number.isInteger(start) || start < 0) throw new Error("Invalid cursor.");
    const cursorKey = cursor ?? "<first>";
    if (this.failCursors.has(cursorKey))
      throw new Error(`Simulated page failure at cursor ${cursorKey}.`);
    if (this.failOnceCursors.has(cursorKey)) {
      this.failOnceCursors.delete(cursorKey);
      throw new Error(`Transient simulated page failure at cursor ${cursorKey}.`);
    }
    const items = this.tasks.slice(start, start + this.pageSize);
    const nextStart = start + this.pageSize - this.overlap;
    const next = start + this.pageSize < this.tasks.length ? String(nextStart) : null;
    return { items, nextCursor: next };
  }
}
