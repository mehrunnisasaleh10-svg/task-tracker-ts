export interface Task {
  id: string;
  title: string;
  completed: boolean;
  createdAt: string;
}

export type AsyncState<T> =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: T }
  | { status: "error"; error: string };
