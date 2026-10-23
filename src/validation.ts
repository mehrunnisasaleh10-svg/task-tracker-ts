import type { Priority, Task, TaskId, Result } from "./types";
import { toTaskId } from "./types";

const PRIORITIES: readonly Priority[] = ["low", "medium", "high"];
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function isPriority(value: unknown): value is Priority {
  return typeof value === "string" && PRIORITIES.some((priority) => priority === value);
}
function parseDate(
  value: unknown,
  field: string,
  nullable: boolean,
  errors: string[],
): Date | null {
  if (nullable && value === null) return null;
  if (value === undefined || value === null) {
    errors.push(`${field} must be ${nullable ? "a valid date or null" : "a valid date"}.`);
    return null;
  }
  const date =
    value instanceof Date
      ? new Date(value.getTime())
      : typeof value === "string" || typeof value === "number"
        ? new Date(value)
        : new Date(Number.NaN);
  if (Number.isNaN(date.getTime())) {
    errors.push(`${field} must be a valid date.`);
    return null;
  }
  return date;
}

export function parseTask(raw: unknown): Result<Task> {
  if (!isRecord(raw)) return { ok: false, errors: ["Task must be an object."] };
  const errors: string[] = [];
  let id: TaskId | undefined;
  if (typeof raw.id !== "string" || raw.id.trim().length === 0)
    errors.push("id must be a non-empty string.");
  else id = toTaskId(raw.id);

  let title: string | undefined;
  if (typeof raw.title !== "string" || raw.title.trim().length === 0)
    errors.push("title must not be empty.");
  else if (raw.title.length > 120) errors.push("title must be 120 characters or fewer.");
  else title = raw.title.trim();

  let priority: Priority | undefined;
  if (!isPriority(raw.priority)) errors.push("priority must be low, medium, or high.");
  else priority = raw.priority;

  let tags: readonly string[] | undefined;
  if (!Array.isArray(raw.tags) || !raw.tags.every((tag: unknown) => typeof tag === "string")) {
    errors.push("tags must be an array of strings.");
  } else tags = Object.freeze([...raw.tags]);

  const completedAt = parseDate(raw.completedAt, "completedAt", true, errors);
  const createdAt = parseDate(raw.createdAt, "createdAt", false, errors);
  if (
    errors.length ||
    id === undefined ||
    title === undefined ||
    priority === undefined ||
    tags === undefined ||
    createdAt === null
  ) {
    return { ok: false, errors };
  }
  const task: Task = Object.freeze({ id, title, priority, completedAt, createdAt, tags });
  return { ok: true, task };
}

export type RejectedTask = Readonly<{ index: number; errors: string[] }>;
export function parseTaskList(raw: unknown): {
  readonly tasks: Task[];
  readonly rejected: RejectedTask[];
} {
  if (!Array.isArray(raw))
    return { tasks: [], rejected: [{ index: -1, errors: ["Task list must be an array."] }] };
  const tasks: Task[] = [];
  const rejected: RejectedTask[] = [];
  raw.forEach((item: unknown, index: number) => {
    const result = parseTask(item);
    if (result.ok) tasks.push(result.task);
    else rejected.push({ index, errors: [...result.errors] });
  });
  return { tasks, rejected };
}
