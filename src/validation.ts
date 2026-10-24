import type { Task, TaskId, TaskPriority } from "./types";

export type ParseTaskResult =
  | { readonly ok: true; readonly task: Task }
  | { readonly ok: false; readonly errors: readonly string[] };

export type ParseTaskListResult = {
  readonly tasks: readonly Task[];
  readonly rejected: readonly {
    readonly index: number;
    readonly errors: readonly string[];
  }[];
};

const priorities: readonly TaskPriority[] = ["low", "medium", "high"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseDate(value: unknown): Date | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return new Date(value.getTime());
  }

  if (typeof value !== "string" || value.trim() === "") {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function parseTask(raw: unknown): ParseTaskResult {
  const errors: string[] = [];

  if (!isRecord(raw)) {
    return { ok: false, errors: ["Task must be an object."] };
  }

  const id = raw.id;
  const title = raw.title;
  const description = raw.description;
  const priority = raw.priority;
  const tags = raw.tags;
  const createdAt = parseDate(raw.createdAt);
  const completedAt =
    raw.completedAt === null ? null : parseDate(raw.completedAt);

  if (typeof id !== "string" || id.trim() === "") {
    errors.push("id must be a non-empty string.");
  }

  if (typeof title !== "string" || title.trim() === "") {
    errors.push("title must be a non-empty string.");
  }

  if (typeof description !== "string") {
    errors.push("description must be a string.");
  }

  if (
    typeof priority !== "string" ||
    !priorities.includes(priority as TaskPriority)
  ) {
    errors.push("priority must be low, medium, or high.");
  }

  if (
    !Array.isArray(tags) ||
    !tags.every((tag: unknown) => typeof tag === "string")
  ) {
    errors.push("tags must be an array of strings.");
  }

  if (!createdAt) {
    errors.push("createdAt must be a valid date.");
  }

  if (raw.completedAt !== null && !completedAt) {
    errors.push("completedAt must be null or a valid date.");
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    task: {
      id: (id as string).trim() as TaskId,
      title: (title as string).trim(),
      description: description as string,
      priority: priority as TaskPriority,
      tags: [...(tags as string[])],
      createdAt: createdAt as Date,
      completedAt,
    },
  };
}

export function parseTaskList(raw: unknown): ParseTaskListResult {
  if (!Array.isArray(raw)) {
    return {
      tasks: [],
      rejected: [{ index: 0, errors: ["Task list must be an array."] }],
    };
  }

  const tasks: Task[] = [];
  const rejected: { index: number; errors: readonly string[] }[] = [];

  raw.forEach((item: unknown, index: number) => {
    const result = parseTask(item);

    if (result.ok) {
      tasks.push(result.task);
    } else {
      rejected.push({ index, errors: result.errors });
    }
  });

  return { tasks, rejected };
}