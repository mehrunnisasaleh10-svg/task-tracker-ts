import type { Priority, Task, TaskId } from "./types";
export type TaskFilter = Readonly<{
  priority?: Priority;
  completed?: boolean;
  tags?: readonly string[];
  from?: Date;
  to?: Date;
}>;
const priorityRank: Record<Priority, number> = { low: 1, medium: 2, high: 3 };

export function filterTasks(tasks: readonly Task[], filter: TaskFilter = {}): Task[] {
  return tasks.filter((task) => {
    if (filter.priority !== undefined && task.priority !== filter.priority) return false;
    if (filter.completed !== undefined && (task.completedAt !== null) !== filter.completed)
      return false;
    if (
      filter.tags !== undefined &&
      filter.tags.length > 0 &&
      !filter.tags.some((tag) => task.tags.includes(tag))
    )
      return false;
    if (filter.from !== undefined && task.createdAt.getTime() < filter.from.getTime()) return false;
    if (filter.to !== undefined && task.createdAt.getTime() > filter.to.getTime()) return false;
    return true;
  });
}

function compareTasks(a: Task, b: Task, key: keyof Task, direction: "asc" | "desc"): number {
  if (key === "completedAt") {
    if (a.completedAt === null && b.completedAt !== null) return 1;
    if (a.completedAt !== null && b.completedAt === null) return -1;
    if (a.completedAt === null && b.completedAt === null) return 0;
    const result = (a.completedAt?.getTime() ?? 0) - (b.completedAt?.getTime() ?? 0);
    return direction === "asc" ? result : -result;
  }
  let result = 0;
  if (key === "title")
    result = a.title.toLocaleLowerCase().localeCompare(b.title.toLocaleLowerCase());
  else if (key === "priority") result = priorityRank[a.priority] - priorityRank[b.priority];
  else if (key === "createdAt") result = a.createdAt.getTime() - b.createdAt.getTime();
  else if (key === "id") result = a.id.localeCompare(b.id);
  else if (key === "tags") result = a.tags.join("|").localeCompare(b.tags.join("|"));
  return direction === "asc" ? result : -result;
}
export function sortTasks(
  tasks: readonly Task[],
  by: keyof Task,
  direction: "asc" | "desc" = "asc",
): Task[] {
  return tasks
    .map((task, index) => ({ task, index }))
    .sort((a, b) => compareTasks(a.task, b.task, by, direction) || a.index - b.index)
    .map(({ task }) => task);
}
export type SortKey = Readonly<{ by: keyof Task; direction: "asc" | "desc" }>;
export function sortTasksBy(tasks: readonly Task[], keys: readonly SortKey[]): Task[] {
  return tasks
    .map((task, index) => ({ task, index }))
    .sort((a, b) => {
      for (const key of keys) {
        const result = compareTasks(a.task, b.task, key.by, key.direction);
        if (result !== 0) return result;
      }
      return a.index - b.index;
    })
    .map(({ task }) => task);
}
export function groupBy<T, K extends PropertyKey>(
  items: readonly T[],
  keyFn: (item: T) => K,
): Record<K, T[]> {
  // A generic Record cannot be initialized with every possible key; keys are populated as encountered.
  const result: Partial<Record<K, T[]>> = {};
  for (const item of items) {
    const key = keyFn(item);
    const bucket = result[key];
    if (bucket) bucket.push(item);
    else result[key] = [item];
  }
  return result as Record<K, T[]>;
}
export type TaskIdLookup = ReadonlyMap<TaskId, Task>;
