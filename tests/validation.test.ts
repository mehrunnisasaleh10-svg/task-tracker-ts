
import { describe, expect, it } from "vitest";
import { parseTask, parseTaskList } from "../src/validation";

const validTask = {
  id: "task-1",
  title: "Complete internship task",
  description: "Implement and verify validation",
  priority: "high",
  tags: ["internship", "testing"],
  createdAt: "2026-10-20T10:00:00.000Z",
  completedAt: null,
};

describe("parseTask", () => {
  it("accepts a valid task", () => {
    expect(parseTask(validTask).ok).toBe(true);
  });

  it("rejects null input", () => {
    expect(parseTask(null).ok).toBe(false);
  });

  it("rejects an empty title", () => {
    expect(parseTask({ ...validTask, title: "" }).ok).toBe(false);
  });

  it("rejects an invalid priority", () => {
    expect(parseTask({ ...validTask, priority: "urgent" }).ok).toBe(false);
  });

  it("rejects invalid tags", () => {
    expect(parseTask({ ...validTask, tags: [123] }).ok).toBe(false);
  });

  it("rejects an invalid creation date", () => {
    expect(parseTask({ ...validTask, createdAt: "not-a-date" }).ok).toBe(false);
  });

  it("rejects an invalid completion date", () => {
    expect(parseTask({ ...validTask, completedAt: "not-a-date" }).ok).toBe(false);
  });

  it("collects multiple validation errors", () => {
    const result = parseTask({ ...validTask, title: "", priority: "urgent" });
    expect(result.ok).toBe(false);

    if (!result.ok) {
      expect(result.errors.length).toBeGreaterThanOrEqual(2);
    }
  });
});

describe("parseTaskList", () => {
  it("keeps valid tasks and reports rejected items", () => {
    const result = parseTaskList([validTask, null]);
    expect(result.tasks).toHaveLength(1);
    expect(result.rejected).toHaveLength(1);
    expect(result.rejected[0]?.index).toBe(1);
  });

  it("handles non-array input", () => {
    const result = parseTaskList("not a list");
    expect(result.tasks).toHaveLength(0);
    expect(result.rejected).toHaveLength(1);
  });
});

