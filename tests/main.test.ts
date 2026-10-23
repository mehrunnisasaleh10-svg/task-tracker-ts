/**
 * Browser integration tests for the Typed Task Tracker.
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("Typed Task Tracker browser app", () => {
  beforeEach(() => {
    vi.resetModules();
    document.body.innerHTML = '<div id="app"></div>';
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
    document.body.innerHTML = "";
  });

  it("renders the dashboard and initial sample tasks", async () => {
    await import("../src/main");

    expect(document.querySelector("h1")?.textContent).toContain("Typed Task Tracker");
    expect(document.querySelector("#stats")?.textContent).toContain("Total tasks");
    expect(document.querySelector("#task-list")?.textContent).toContain(
      "Review project requirements",
    );
    expect(document.querySelector("#task-list")?.textContent).toContain("Write unit tests");
  });

  it("shows a validation message for a blank task title", async () => {
    await import("../src/main");

    const form = document.querySelector<HTMLFormElement>("#task-form")!;
    const title = document.querySelector<HTMLInputElement>("#task-title")!;
    title.value = "   ";

    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));

    expect(document.querySelector("#notice")?.textContent).toContain("Please enter a title");
  });

  it("filters tasks by priority and completion status", async () => {
    await import("../src/main");

    const priority = document.querySelector<HTMLSelectElement>("#filter-priority")!;
    priority.value = "high";
    priority.dispatchEvent(new Event("change", { bubbles: true }));

    expect(document.querySelector("#task-list")?.textContent).toContain(
      "Review project requirements",
    );

    const status = document.querySelector<HTMLSelectElement>("#filter-status")!;
    status.value = "done";
    status.dispatchEvent(new Event("change", { bubbles: true }));

    expect(document.querySelector("#result-count")?.textContent).toContain("0 of 3 tasks");
  });

  it("changes the task sorting option", async () => {
    await import("../src/main");

    const sort = document.querySelector<HTMLSelectElement>("#sort-by")!;
    sort.value = "title";
    sort.dispatchEvent(new Event("change", { bubbles: true }));

    expect(sort.value).toBe("title");
    expect(document.querySelector("#task-list")).not.toBeNull();
  });

  it("supports task search", async () => {
    vi.useFakeTimers();
    await import("../src/main");

    const search = document.querySelector<HTMLInputElement>("#search")!;
    search.value = "Write unit tests";
    search.dispatchEvent(new Event("input", { bubbles: true }));

    await vi.advanceTimersByTimeAsync(200);

    expect(document.querySelector("#task-list")?.textContent).toContain("Write unit tests");
    expect(document.querySelector("#result-count")?.textContent).toContain("1 of 3 tasks");
  });

  it("adds a task through the form", async () => {
    await import("../src/main");

    const title = document.querySelector<HTMLInputElement>("#task-title")!;
    const tags = document.querySelector<HTMLInputElement>("#task-tags")!;
    title.value = "Prepare internship report";
    tags.value = "internship, report";

    const form = document.querySelector<HTMLFormElement>("#task-form")!;
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));

    await vi.waitFor(() => {
      expect(document.querySelector("#task-list")?.textContent).toContain(
        "Prepare internship report",
      );
    });
  });

  it("handles an unknown app container without crashing the test", async () => {
    document.body.innerHTML = "";

    await expect(import("../src/main")).rejects.toThrow('App element "#app" was not found.');
  });
});
