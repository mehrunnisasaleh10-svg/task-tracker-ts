import type { Task } from "./types";

export function parseTask(raw: unknown): Task {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    throw new Error("Task must be an object");
  }

  const value = raw as Record<string, unknown>;

  if (typeof value.id !== "string" || value.id.trim() === "") {
    throw new Error("Task id must be a non-empty string");
  }

  if (typeof value.title !== "string" || value.title.trim() === "") {
    throw new Error("Task title must be a non-empty string");
  }

  if (typeof value.completed !== "boolean") {
    throw new Error("Task completed must be a boolean");
  }

  if (
    typeof value.createdAt !== "string" ||
    value.createdAt.trim() === "" ||
    Number.isNaN(Date.parse(value.createdAt))
  ) {
    throw new Error("Task createdAt must be a valid date string");
  }

  return {
    id: value.id,
    title: value.title,
    completed: value.completed,
    createdAt: value.createdAt,
  };
}