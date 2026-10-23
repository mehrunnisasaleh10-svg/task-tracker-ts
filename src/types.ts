/** Branded IDs prevent arbitrary strings being passed as task identifiers. */
export type TaskId = string & { readonly __brand: "TaskId" };
export type Priority = "low" | "medium" | "high";

export type Task = Readonly<{
  id: TaskId;
  title: string;
  priority: Priority;
  /** null means open; a Date records exactly when completion happened. It is never undefined. */
  completedAt: Date | null;
  createdAt: Date;
  tags: readonly string[];
}>;

export type AsyncState<T> =
  | { readonly status: "loading" }
  | { readonly status: "error"; readonly message: string }
  | { readonly status: "empty" }
  | { readonly status: "success"; readonly data: T };

export type Result<T> =
  { readonly ok: true; readonly task: T } | { readonly ok: false; readonly errors: string[] };

export function toTaskId(value: string): TaskId {
  if (value.trim().length === 0) throw new Error("Task id cannot be empty.");
  // This is the one intentional branding cast: runtime validation above establishes the string invariant.
  return value as TaskId;
}

export function assertNever(value: never): never {
  throw new Error(`Unhandled variant: ${JSON.stringify(value)}`);
}

export function mapAsyncState<T, U>(state: AsyncState<T>, fn: (value: T) => U): AsyncState<U> {
  switch (state.status) {
    case "loading":
      return state;
    case "error":
      return state;
    case "empty":
      return state;
    case "success":
      return { status: "success", data: fn(state.data) };
    default:
      return assertNever(state);
  }
}
