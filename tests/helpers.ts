import type { Task, Priority } from "../src/types";
import { toTaskId } from "../src/types";

export function task(id: string, overrides: Partial<Omit<Task, "id">> = {}): Task {
  const priority: Priority = overrides.priority ?? "medium";
  return Object.freeze({
    id: toTaskId(id),
    title: overrides.title ?? `Task ${id}`,
    priority,
    completedAt: overrides.completedAt === undefined ? null : overrides.completedAt,
    createdAt: overrides.createdAt ?? new Date("2026-01-01T00:00:00.000Z"),
    tags: Object.freeze([...(overrides.tags ?? [])]),
  });
}
