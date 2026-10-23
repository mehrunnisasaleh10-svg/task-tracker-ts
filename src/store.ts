import type { Task, TaskId, AsyncState } from "./types";
import type { TaskApi, TaskDraft } from "./api";
import { assertNever, toTaskId } from "./types";

export type StoreAction =
  | { readonly type: "replace"; readonly tasks: readonly Task[] }
  | { readonly type: "add"; readonly task: Task }
  | { readonly type: "update"; readonly task: Task }
  | { readonly type: "delete"; readonly id: TaskId }
  | { readonly type: "error"; readonly message: string }
  | { readonly type: "clear-error" };

export type StoreState = Readonly<{ tasks: readonly Task[]; error: string | null }>;

export function reducer(state: StoreState, action: StoreAction): StoreState {
  switch (action.type) {
    case "replace":
      return { ...state, tasks: [...action.tasks] };
    case "add":
      return { ...state, tasks: [...state.tasks, action.task], error: null };
    case "update": {
      if (!state.tasks.some((task) => task.id === action.task.id)) return state;
      return {
        ...state,
        tasks: state.tasks.map((task) => (task.id === action.task.id ? action.task : task)),
        error: null,
      };
    }
    case "delete": {
      if (!state.tasks.some((task) => task.id === action.id)) return state;
      return { ...state, tasks: state.tasks.filter((task) => task.id !== action.id), error: null };
    }
    case "error":
      return state.error === action.message ? state : { ...state, error: action.message };
    case "clear-error":
      return state.error === null ? state : { ...state, error: null };
    default:
      return assertNever(action);
  }
}

export function createTaskStore(api: TaskApi, initial: readonly Task[] = []) {
  let state: StoreState = { tasks: [...initial], error: null };
  const listeners = new Set<(state: StoreState) => void>();
  const notify = (): void => {
    for (const listener of [...listeners]) listener(state);
  };
  const dispatch = (action: StoreAction): void => {
    const next = reducer(state, action);
    if (next !== state) {
      state = next;
      notify();
    }
  };
  const pendingById = new Map<TaskId, number>();

  return {
    getState: (): StoreState => state,
    getAsyncState: (): AsyncState<Task[]> =>
      state.error
        ? { status: "error", message: state.error }
        : state.tasks.length
          ? { status: "success", data: [...state.tasks] }
          : { status: "empty" },
    subscribe(listener: (state: StoreState) => void): () => void {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    async addTask(draft: TaskDraft): Promise<void> {
      const tempId = toTaskId(`temp-${Date.now()}-${Math.random()}`);
      const optimistic: Task = Object.freeze({
        ...draft,
        id: tempId,
        completedAt: null,
        createdAt: new Date(),
        tags: Object.freeze([...draft.tags]),
      });
      dispatch({ type: "add", task: optimistic });
      try {
        const saved = await api.add(draft);
        dispatch({ type: "delete", id: tempId });
        dispatch({ type: "add", task: saved });
      } catch (error: unknown) {
        dispatch({ type: "delete", id: tempId });
        dispatch({
          type: "error",
          message: error instanceof Error ? error.message : "Could not add task.",
        });
      }
    },
    async updateTask(id: TaskId, changes: Partial<TaskDraft>): Promise<void> {
      const previous = state.tasks.find((task) => task.id === id);
      if (!previous) {
        dispatch({ type: "error", message: "Task not found." });
        return;
      }
      // Latest mutation wins: older responses are ignored; only the latest failed mutation may roll back.
      const version = (pendingById.get(id) ?? 0) + 1;
      pendingById.set(id, version);
      const optimistic: Task = Object.freeze({
        ...previous,
        ...(changes.title === undefined ? {} : { title: changes.title }),
        ...(changes.priority === undefined ? {} : { priority: changes.priority }),
        ...(changes.tags === undefined ? {} : { tags: Object.freeze([...changes.tags]) }),
      });
      dispatch({ type: "update", task: optimistic });
      try {
        const saved = await api.update(id, changes);
        if (pendingById.get(id) === version) dispatch({ type: "update", task: saved });
      } catch (error: unknown) {
        // Only the latest mutation may roll back, so an old failure cannot erase a newer update.
        if (pendingById.get(id) === version) {
          dispatch({ type: "update", task: previous });
          dispatch({
            type: "error",
            message: error instanceof Error ? error.message : "Update failed.",
          });
        }
      }
    },
    async toggleComplete(id: TaskId): Promise<void> {
      const previous = state.tasks.find((task) => task.id === id);
      if (!previous) {
        dispatch({ type: "error", message: "Task not found." });
        return;
      }
      // Latest mutation wins: older responses are ignored; only the latest failed mutation may roll back.
      const version = (pendingById.get(id) ?? 0) + 1;
      pendingById.set(id, version);
      const optimistic: Task = Object.freeze({
        ...previous,
        completedAt: previous.completedAt === null ? new Date() : null,
      });
      dispatch({ type: "update", task: optimistic });
      try {
        const saved = await api.update(id, { completedAt: optimistic.completedAt });
        if (pendingById.get(id) === version)
          dispatch({
            type: "update",
            task: Object.freeze({ ...saved, completedAt: optimistic.completedAt }),
          });
      } catch (error: unknown) {
        if (pendingById.get(id) === version) {
          dispatch({ type: "update", task: previous });
          dispatch({
            type: "error",
            message: error instanceof Error ? error.message : "Completion update failed.",
          });
        }
      }
    },
    async deleteTask(id: TaskId): Promise<void> {
      const previous = state.tasks.find((task) => task.id === id);
      if (!previous) return;
      const version = (pendingById.get(id) ?? 0) + 1;
      pendingById.set(id, version);
      dispatch({ type: "delete", id });
      try {
        await api.remove(id);
      } catch (error: unknown) {
        if (pendingById.get(id) === version && !state.tasks.some((task) => task.id === id))
          dispatch({ type: "add", task: previous });
        dispatch({
          type: "error",
          message: error instanceof Error ? error.message : "Delete failed.",
        });
      }
    },
    clearError(): void {
      dispatch({ type: "clear-error" });
    },
  };
}
