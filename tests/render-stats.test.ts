import { describe, expect, it } from "vitest";
import { escapeHtml, renderTasks } from "../src/render";
import { computeStats } from "../src/stats";
import { task } from "./helpers";

describe("safe rendering", () => {
  it("renders each async state distinctly", () => {
    expect(renderTasks({ status: "loading" })).toContain("Loading tasks");
    expect(renderTasks({ status: "empty" })).toContain("No tasks yet");
    expect(renderTasks({ status: "error", message: "offline" })).toContain(
      "Please check your connection and try again.",
    );
    expect(renderTasks({ status: "success", data: [task("one")] })).toContain("priority-medium");
  });
  it("escapes script-like user input", () => {
    expect(escapeHtml("<script>alert(1)</script>")).toBe("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(renderTasks({ status: "error", message: "<img src=x>" })).not.toContain("<img src=x>");
  });
});

describe("statistics", () => {
  it("returns safe zeros for an empty task list", () => {
    expect(computeStats([])).toMatchObject({
      total: 0,
      completed: 0,
      open: 0,
      completionRate: 0,
      averageCompletionHours: 0,
    });
    expect(Number.isNaN(computeStats([]).completionRate)).toBe(false);
  });
  it("counts tasks and calculates completion rate and average hours", () => {
    const tasks = [
      task("done", {
        createdAt: new Date("2026-01-01T00:00:00Z"),
        completedAt: new Date("2026-01-01T02:00:00Z"),
        priority: "high",
      }),
      task("open", { priority: "low" }),
    ];
    expect(computeStats(tasks)).toMatchObject({
      total: 2,
      completed: 1,
      open: 1,
      completionRate: 0.5,
      byPriority: { low: 1, medium: 0, high: 1 },
      averageCompletionHours: 2,
    });
  });
});
