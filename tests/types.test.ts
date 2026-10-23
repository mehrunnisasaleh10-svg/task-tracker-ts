import { describe, expect, it } from "vitest";
import { assertNever, mapAsyncState } from "../src/types";
import { renderAsyncState } from "../src/render";

describe("generic async state", () => {
  it("maps only success data", () => {
    expect(mapAsyncState({ status: "success", data: 2 }, (n) => String(n))).toEqual({
      status: "success",
      data: "2",
    });
    expect(mapAsyncState({ status: "loading" }, (n: number) => n + 1)).toEqual({
      status: "loading",
    });
    expect(mapAsyncState({ status: "empty" }, (n: number) => n + 1)).toEqual({ status: "empty" });
    expect(mapAsyncState({ status: "error", message: "offline" }, (n: number) => n + 1)).toEqual({
      status: "error",
      message: "offline",
    });
  });
  it("works with string and number payloads", () => {
    expect(mapAsyncState({ status: "success", data: "hello" }, (value) => value.length)).toEqual({
      status: "success",
      data: 5,
    });
    expect(mapAsyncState({ status: "success", data: 7 }, (value) => value * 2)).toEqual({
      status: "success",
      data: 14,
    });
  });
  it("renders generic string and number success states", () => {
    expect(
      renderAsyncState({ status: "success", data: "hello" }, (value) => `<p>${value}</p>`),
    ).toContain("<p>hello</p>");
    expect(
      renderAsyncState({ status: "success", data: 42 }, (value) => `<output>${value * 2}</output>`),
    ).toContain("<output>84</output>");
  });
  it("throws for an unexpected runtime variant", () => {
    // The cast deliberately simulates an impossible runtime value to exercise the defensive branch.
    expect(() => assertNever("unexpected" as never)).toThrow("Unhandled variant");
  });
});
