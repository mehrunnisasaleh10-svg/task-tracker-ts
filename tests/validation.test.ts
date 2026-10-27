import { describe, expect, it } from "vitest";
import { parseTask } from "../src/validation";

describe("parseTask", () => {
  const validTask = {
    id: "task-1",
    title: "Complete assignment",
    completed: false,
    createdAt: "2026-10-26T10:00:00.000Z",
  };

  it("accepts a valid task", () => {
    expect(parseTask(validTask)).toEqual(validTask);
  });

  it("rejects null", () => {
    expect(() => parseTask(null)).toThrow("Task must be an object");
  });

  it("rejects an array", () => {
    expect(() => parseTask([])).toThrow("Task must be an object");
  });

  it("rejects an empty id", () => {
    expect(() => parseTask({ ...validTask, id: " " })).toThrow(
      "Task id must be a non-empty string",
    );
  });

  it("rejects a non-string id", () => {
    expect(() => parseTask({ ...validTask, id: 123 })).toThrow(
      "Task id must be a non-empty string",
    );
  });

  it("rejects an empty title", () => {
    expect(() => parseTask({ ...validTask, title: "" })).toThrow(
      "Task title must be a non-empty string",
    );
  });

  it("rejects a non-boolean completed value", () => {
    expect(() => parseTask({ ...validTask, completed: "false" })).toThrow(
      "Task completed must be a boolean",
    );
  });

  it("rejects an invalid date", () => {
    expect(() => parseTask({ ...validTask, createdAt: "not-a-date" })).toThrow(
      "Task createdAt must be a valid date string",
    );
  });

  it("rejects a missing title", () => {
    const task = { ...validTask };
    delete (task as Partial<typeof validTask>).title;
    expect(() => parseTask(task)).toThrow(
      "Task title must be a non-empty string",
    );
  });

  it("rejects a missing completed value", () => {
    const task = { ...validTask };
    delete (task as Partial<typeof validTask>).completed;
    expect(() => parseTask(task)).toThrow(
      "Task completed must be a boolean",
    );
  });
});


