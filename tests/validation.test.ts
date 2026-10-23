import { describe, expect, it } from "vitest";
import { parseTask, parseTaskList } from "../src/validation";

const valid = {
  id: "abc",
  title: " A task ",
  priority: "high",
  completedAt: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  tags: ["work"],
};

describe("task validation", () => {
  it("parses and normalizes a valid task", () => {
    const result = parseTask(valid);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.task.title).toBe("A task");
      expect(result.task.createdAt).toBeInstanceOf(Date);
      expect(Object.isFrozen(result.task)).toBe(true);
    }
  });
  it.each([
    [{ ...valid, title: "   " }, "title"],
    [{ ...valid, title: "x".repeat(121) }, "120"],
    [{ ...valid, priority: "urgent" }, "priority"],
    [{ ...valid, id: "" }, "id"],
    [{ ...valid, tags: [2] }, "tags"],
    [{ ...valid, createdAt: "not-a-date" }, "createdAt"],
    [{ ...valid, completedAt: "Invalid Date" }, "completedAt"],
  ])("rejects invalid data %#", (input, message) => {
    const result = parseTask(input);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.join(" ")).toContain(message);
  });
  it("collects more than one validation error", () => {
    const result = parseTask({ ...valid, title: " ", priority: "urgent", tags: 3 });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.length).toBeGreaterThanOrEqual(3);
  });
  it("rejects non-object values", () => {
    expect(parseTask(null).ok).toBe(false);
    expect(parseTask("task").ok).toBe(false);
  });
  it("keeps valid list entries and reports bad indexes", () => {
    const result = parseTaskList([valid, { ...valid, id: "" }, { ...valid, id: "second" }]);
    expect(result.tasks).toHaveLength(2);
    expect(result.rejected).toHaveLength(1);
    expect(result.rejected[0]?.index).toBe(1);
  });
  it("handles a non-array list gracefully", () => {
    expect(parseTaskList("not an array").tasks).toEqual([]);
    expect(parseTaskList("not an array").rejected[0]?.index).toBe(-1);
  });
});
