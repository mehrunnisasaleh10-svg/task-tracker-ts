import { describe, expect, it, vi } from "vitest";
import { createTaskStore } from "../src/store";
import { SimulatedTaskApi } from "../src/api";
import { task } from "./helpers";

describe("task store", () => {
  it("adds, updates, completes and deletes tasks", async () => {
    const initial = task("one");
    const api = new SimulatedTaskApi([initial], 0);
    const store = createTaskStore(api, [initial]);
    await store.updateTask(initial.id, { title: "Changed" });
    expect(store.getState().tasks[0]?.title).toBe("Changed");
    await store.toggleComplete(initial.id);
    expect(store.getState().tasks[0]?.completedAt).not.toBeNull();
    await store.deleteTask(initial.id);
    expect(store.getState().tasks).toHaveLength(0);
    await store.addTask({ title: "New task", priority: "low", tags: [] });
    expect(store.getState().tasks).toHaveLength(1);
  });
  it("notifies listeners and unsubscribe prevents future notifications", async () => {
    const store = createTaskStore(new SimulatedTaskApi([], 0));
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);
    await store.addTask({ title: "A", priority: "low", tags: [] });
    expect(listener).toHaveBeenCalled();
    const count = listener.mock.calls.length;
    unsubscribe();
    await store.addTask({ title: "B", priority: "low", tags: [] });
    expect(listener).toHaveBeenCalledTimes(count);
  });
  it("ignores an older response after a newer same-task update succeeds", async () => {
    const initial = task("one");
    const api = new SimulatedTaskApi([initial], 0);
    const resolvers = new Map<string, (value: typeof initial) => void>();
    api.update = async (_id, changes) =>
      new Promise((resolve) => {
        const title = changes.title ?? "untitled";
        resolvers.set(title, resolve);
      });
    const store = createTaskStore(api, [initial]);
    const first = store.updateTask(initial.id, { title: "First" });
    const second = store.updateTask(initial.id, { title: "Second" });
    const secondTask = Object.freeze({ ...initial, title: "Second" });
    resolvers.get("Second")?.(secondTask);
    await second;
    resolvers.get("First")?.(Object.freeze({ ...initial, title: "First" }));
    await first;
    expect(store.getState().tasks[0]?.title).toBe("Second");
  });
  it("surfaces API errors without crashing", async () => {
    const api = new SimulatedTaskApi([], 0);
    api.add = async () => {
      throw new Error("offline");
    };
    const store = createTaskStore(api);
    await store.addTask({ title: "A", priority: "low", tags: [] });
    expect(store.getState().error).toBe("offline");
    expect(store.getState().tasks).toHaveLength(0);
  });
});
