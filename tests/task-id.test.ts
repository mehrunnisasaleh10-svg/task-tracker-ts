import { describe, expect, it } from "vitest";
import { toTaskId } from "../src/types";

describe("toTaskId", () => {
  it("accepts a valid task ID", () => {
    expect(toTaskId("task-1")).toBe("task-1");
  });

  it("rejects an empty task ID", () => {
    expect(() => toTaskId("   ")).toThrow("Task id cannot be empty.");
  });
});
