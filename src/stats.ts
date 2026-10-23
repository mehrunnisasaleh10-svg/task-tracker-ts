import type { Priority, Task } from "./types";

export type TaskStats = Readonly<{
  total: number;
  completed: number;
  open: number;
  completionRate: number;
  byPriority: Readonly<Record<Priority, number>>;
  averageCompletionHours: number;
}>;

export function computeStats(tasks: readonly Task[]): TaskStats {
  const completedTasks = tasks.filter((task) => task.completedAt !== null);
  const byPriority: Record<Priority, number> = { low: 0, medium: 0, high: 0 };
  for (const task of tasks) byPriority[task.priority] += 1;
  const hours = completedTasks.flatMap((task) => {
    const completedAt = task.completedAt;
    return completedAt === null
      ? []
      : [Math.max(0, (completedAt.getTime() - task.createdAt.getTime()) / 3_600_000)];
  });
  return {
    total: tasks.length,
    completed: completedTasks.length,
    open: tasks.length - completedTasks.length,
    completionRate: tasks.length === 0 ? 0 : completedTasks.length / tasks.length,
    byPriority,
    averageCompletionHours:
      hours.length === 0 ? 0 : hours.reduce((sum, value) => sum + value, 0) / hours.length,
  };
}
