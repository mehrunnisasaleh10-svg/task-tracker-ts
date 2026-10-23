import { afterEach, describe, expect, it, vi } from "vitest";
import { SimulatedTaskApi, makeTask } from "../src/api";
import { toTaskId } from "../src/types";
import { task } from "./helpers";

afterEach(() => {
  vi.useRealTimers();
});

describe("makeTask", () => {
  it("trims the title and freezes the task and tags", () => {
    const result = makeTask(
      { title: "  Learn TypeScript  ", priority: "high", tags: ["study"] },
      "new-task",
      new Date("2026-01-01T00:00:00.000Z"),
    );

    expect(result.title).toBe("Learn TypeScript");
    expect(result.id).toBe(toTaskId("new-task"));
    expect(result.completedAt).toBeNull();
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.tags)).toBe(true);
    expect(result.createdAt).not.toBeInstanceOf(String);
  });
});

describe("SimulatedTaskApi", () => {
  it("lists seeded tasks without exposing its internal array", async () => {
    const api = new SimulatedTaskApi([task("a")], 0);

    const first = await api.list();
    first.pop();

    expect(await api.list()).toHaveLength(1);
  });

  it("adds tasks with generated IDs", async () => {
    const api = new SimulatedTaskApi([], 0);

    const first = await api.add({
      title: " First task ",
      priority: "medium",
      tags: ["work"],
    });
    const second = await api.add({
      title: "Second task",
      priority: "low",
      tags: [],
    });

    expect(first.id).toBe("task-100");
    expect(first.title).toBe("First task");
    expect(second.id).toBe("task-101");
    expect(await api.list()).toHaveLength(2);
  });

  it("updates only the supplied fields", async () => {
    const api = new SimulatedTaskApi([task("a")], 0);
    const listed = await api.list();
    const original = listed[0];
    if (!original) throw new Error("Expected seeded task.");

    const updated = await api.update(original.id, {
      title: "  Updated title ",
      tags: ["updated"],
    });

    expect(updated.title).toBe("Updated title");
    expect(updated.tags).toEqual(["updated"]);
    expect(updated.priority).toBe(original.priority);
    expect(updated.createdAt).toEqual(original.createdAt);
    expect(Object.isFrozen(updated)).toBe(true);
  });

  it("rejects updates for a task that does not exist", async () => {
    const api = new SimulatedTaskApi([], 0);

    await expect(api.update(toTaskId("missing"), { title: "Changed" })).rejects.toThrow(
      "Task not found.",
    );
  });

  it("removes an existing task", async () => {
    const api = new SimulatedTaskApi([task("a"), task("b")], 0);

    await api.remove(toTaskId("a"));

    expect((await api.list()).map((item) => item.id)).toEqual(["b"]);
  });

  it("does not fail when removing a missing task", async () => {
    const api = new SimulatedTaskApi([], 0);

    await expect(api.remove(toTaskId("missing"))).resolves.toBeUndefined();
  });

  it("returns pages and a next cursor when more tasks remain", async () => {
    const api = new SimulatedTaskApi([task("a"), task("b"), task("c"), task("d")], 0);

    const first = await api.fetchPage(null);
    const second = await api.fetchPage(first.nextCursor);

    expect(first.items).toHaveLength(3);
    expect(first.nextCursor).toBe("2");
    expect(second.items).toHaveLength(2);
    expect(second.items[0]?.id).toBe("c");
    expect(second.nextCursor).toBeNull();
  });

  it("can simulate a transiently failing page and a persistently failing page", async () => {
    const tasks = [task("a"), task("b"), task("c"), task("d")];
    const flaky = new SimulatedTaskApi(tasks, 0, { failOnceCursors: ["<first>"] });
    await expect(flaky.fetchPage(null)).rejects.toThrow("Transient simulated page failure");
    await expect(flaky.fetchPage(null)).resolves.toMatchObject({ items: tasks.slice(0, 3) });
    const failing = new SimulatedTaskApi(tasks, 0, { failCursors: ["2"] });
    await expect(failing.fetchPage("2")).rejects.toThrow("Simulated page failure");
  });

  it("rejects invalid cursors", async () => {
    const api = new SimulatedTaskApi([], 0);

    await expect(api.fetchPage("invalid")).rejects.toThrow("Invalid cursor.");
    await expect(api.fetchPage("-1")).rejects.toThrow("Invalid cursor.");
    await expect(api.fetchPage("1.5")).rejects.toThrow("Invalid cursor.");
  });

  it("rejects an already-aborted list request", async () => {
    const api = new SimulatedTaskApi([task("a")], 0);
    const controller = new AbortController();
    controller.abort();

    await expect(api.list(controller.signal)).rejects.toMatchObject({
      name: "AbortError",
    });
  });

  it("rejects an already-aborted page request", async () => {
    const api = new SimulatedTaskApi([task("a")], 0);
    const controller = new AbortController();
    controller.abort();

    await expect(api.fetchPage(null, controller.signal)).rejects.toMatchObject({
      name: "AbortError",
    });
  });
});
