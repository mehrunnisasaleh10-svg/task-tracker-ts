import { describe, expect, it, vi } from "vitest";
import { assertNever, mapAsyncState, type AsyncState } from "../src/types";

describe("mapAsyncState", () => {
  it("preserves idle state", () => {
    expect(mapAsyncState({ status: "idle" }, (value: number) => value * 2)).toEqual({
      status: "idle",
    });
  });

  it("preserves loading state", () => {
    expect(mapAsyncState({ status: "loading" }, (value: number) => value * 2)).toEqual({
      status: "loading",
    });
  });

  it("maps success data", () => {
    const mapData = vi.fn((value: number) => value * 2);
    const state: AsyncState<number> = { status: "success", data: 5 };

    expect(mapAsyncState(state, mapData)).toEqual({
      status: "success",
      data: 10,
    });
    expect(mapData).toHaveBeenCalledWith(5);
  });

  it("preserves error state", () => {
    const error = new Error("Request failed");
    const state: AsyncState<number> = { status: "error", error };

    expect(mapAsyncState(state, (value: number) => value * 2)).toEqual({
      status: "error",
      error,
    });
  });
});

describe("assertNever", () => {
  it("throws an error for an unexpected value", () => {
    expect(() => assertNever("unexpected" as never)).toThrow("Unexpected value: unexpected");
  });
});
