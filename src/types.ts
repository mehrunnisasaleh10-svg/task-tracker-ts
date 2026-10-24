export type TaskId = string & { readonly __brand: "TaskId" };

export type TaskPriority = "low" | "medium" | "high";

export type Task = {
  readonly id: TaskId;
  readonly title: string;
  readonly description: string;
  readonly priority: TaskPriority;
  readonly tags: readonly string[];
  readonly createdAt: Date;
  readonly completedAt: Date | null;
};

export type AsyncState<T> =
  | { readonly status: "idle" }
  | { readonly status: "loading" }
  | { readonly status: "success"; readonly data: T }
  | { readonly status: "error"; readonly error: Error };

export function assertNever(value: never): never {
  throw new Error(`Unexpected value: ${String(value)}`);
}

export function mapAsyncState<T, U>(state: AsyncState<T>, mapData: (data: T) => U): AsyncState<U> {
  switch (state.status) {
    case "idle":
      return { status: "idle" };

    case "loading":
      return { status: "loading" };

    case "success":
      return { status: "success", data: mapData(state.data) };

    case "error":
      return { status: "error", error: state.error };

    default:
      return assertNever(state);
  }
}
