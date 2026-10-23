import { describe, expect, it } from "vitest";
import { filterTasks, groupBy, sortTasks, sortTasksBy } from "../src/filters";
import { task } from "./helpers";

const tasks = [
  task("1", { title: "beta", priority: "high", tags: ["work"], createdAt: new Date("2026-01-03") }),
  task("2", {
    title: "Alpha",
    priority: "low",
    completedAt: new Date("2026-01-04"),
    tags: ["home"],
    createdAt: new Date("2026-01-01"),
  }),
  task("3", {
    title: "alpha",
    priority: "medium",
    tags: ["work", "home"],
    createdAt: new Date("2026-01-02"),
  }),
];

describe("filter, sort and group", () => {
  it("combines filter criteria with AND", () => {
    expect(
      filterTasks(tasks, {
        priority: "medium",
        completed: false,
        tags: ["work"],
        from: new Date("2026-01-01"),
        to: new Date("2026-01-03"),
      }).map((x) => x.id),
    ).toEqual(["3"]);
  });
  it("returns all tasks for an empty filter", () => {
    expect(filterTasks(tasks)).toHaveLength(3);
  });
  it("filters by completion and any matching tag", () => {
    expect(filterTasks(tasks, { completed: true }).map((x) => x.id)).toEqual(["2"]);
    expect(filterTasks(tasks, { tags: ["home", "missing"] }).map((x) => x.id)).toEqual(["2", "3"]);
  });
  it("sorts title case-insensitively and stably", () => {
    expect(sortTasks(tasks, "title").map((x) => x.id)).toEqual(["2", "3", "1"]);
  });
  it("sorts IDs and tag arrays", () => {
    expect(sortTasks(tasks, "id").map((item) => item.id)).toEqual(["1", "2", "3"]);
    expect(sortTasks(tasks, "tags").map((item) => item.id)).toEqual(["2", "1", "3"]);
  });
  it("sorts priorities by custom rank", () => {
    expect(sortTasks(tasks, "priority").map((x) => x.priority)).toEqual(["low", "medium", "high"]);
  });
  it("keeps null completion dates last in either direction", () => {
    expect(sortTasks(tasks, "completedAt", "asc").at(-1)?.completedAt).toBeNull();
    expect(sortTasks(tasks, "completedAt", "desc").at(-1)?.completedAt).toBeNull();
  });
  it("does not mutate the input array", () => {
    const original = [...tasks];
    sortTasks(tasks, "createdAt");
    expect(tasks).toEqual(original);
  });
  it("supports multi-key sorting", () => {
    const result = sortTasksBy(tasks, [
      { by: "priority", direction: "asc" },
      { by: "title", direction: "asc" },
    ]);
    expect(result.map((x) => x.id)).toEqual(["2", "3", "1"]);
  });
  it("groups by priority", () => {
    const groups = groupBy(tasks, (item) => item.priority);
    expect(groups.high?.[0]?.id).toBe("1");
    expect(groups.low?.[0]?.id).toBe("2");
  });
  it("satisfies basic sorting and filtering properties", () => {
    const once = sortTasks(tasks, "title");
    const twice = sortTasks(once, "title");
    expect(twice.map((item) => item.id)).toEqual(once.map((item) => item.id));
    expect(filterTasks(tasks, { priority: "high" }).length).toBeLessThanOrEqual(tasks.length);
    expect(tasks.map((item) => item.id)).toEqual(["1", "2", "3"]);
  });
  it("rejects invalid sort fields at compile time", () => {
    // @ts-expect-error "madeUp" is not a keyof Task.
    expect(sortTasks(tasks, "madeUp")).toHaveLength(tasks.length);
  });
});
