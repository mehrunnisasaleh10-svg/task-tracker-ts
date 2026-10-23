import type { AsyncState, Task } from "./types";
import type { TaskApi } from "./api";
import { retry } from "./fetcher";

export class TaskPageLoader {
  private tasks: Task[] = [];
  private cursor: string | null = null;
  private loading = false;
  private finished = false;
  private readonly seenCursors = new Set<string>();
  private pageCount = 0;
  private state: AsyncState<Task[]> = { status: "loading" };

  constructor(
    private readonly api: Pick<TaskApi, "fetchPage">,
    private readonly maxPages = 100,
  ) {}

  getState(): AsyncState<Task[]> {
    return this.state.status === "success"
      ? { status: "success", data: [...this.state.data] }
      : this.state;
  }

  /** Keeps already-loaded pages available even when a later page fails. */
  getTasks(): Task[] {
    return [...this.tasks];
  }

  async loadMore(): Promise<AsyncState<Task[]>> {
    if (this.loading || this.finished) return this.getState();
    this.loading = true;
    this.state = { status: "loading" };
    try {
      if (this.pageCount >= this.maxPages) throw new Error("Maximum page count reached.");
      const requestedCursor = this.cursor;
      if (requestedCursor !== null && this.seenCursors.has(requestedCursor))
        throw new Error("Repeated cursor detected.");
      const page = await retry((signal) => this.api.fetchPage(requestedCursor, signal), {
        attempts: 3,
        timeoutMs: 2000,
        baseDelayMs: 5,
      });
      if (requestedCursor !== null) this.seenCursors.add(requestedCursor);
      this.pageCount += 1;
      const byId = new Map(this.tasks.map((task) => [task.id, task]));
      // When an overlapping page repeats an ID, keep whichever version has the later createdAt timestamp.
      for (const incoming of page.items) {
        const existing = byId.get(incoming.id);
        if (!existing || incoming.createdAt > existing.createdAt) byId.set(incoming.id, incoming);
      }
      this.tasks = [...byId.values()];
      this.cursor = page.nextCursor;
      this.finished = page.nextCursor === null;
      this.state =
        this.tasks.length === 0
          ? { status: "empty" }
          : { status: "success", data: [...this.tasks] };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown page loading error.";
      this.state = { status: "error", message };
    } finally {
      this.loading = false;
    }
    return this.getState();
  }
}
