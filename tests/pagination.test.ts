import { describe, expect, it } from "vitest";
import { TaskPageLoader } from "../src/pagination";
import { task } from "./helpers";

describe("paginated loader", () => {
  it("deduplicates overlapping IDs and keeps the newest createdAt", async () => {
    const older = task("same", { title: "old", createdAt: new Date("2026-01-01") });
    const newer = task("same", { title: "new", createdAt: new Date("2026-02-01") });
    let call = 0;
    const loader = new TaskPageLoader({
      fetchPage: async () => {
        call += 1;
        return call === 1
          ? { items: [older], nextCursor: "next" }
          : { items: [newer], nextCursor: null };
      },
    });
    await loader.loadMore();
    const state = await loader.loadMore();
    expect(state.status).toBe("success");
    if (state.status === "success") {
      expect(state.data).toHaveLength(1);
      expect(state.data[0]?.title).toBe("new");
    }
  });
  it("retains already loaded pages when a later page fails", async () => {
    let call = 0;
    const loader = new TaskPageLoader({
      fetchPage: async () => {
        call += 1;
        if (call === 1) return { items: [task("one")], nextCursor: "next" };
        throw new Error("page failed");
      },
    });
    await loader.loadMore();
    const state = await loader.loadMore();
    expect(state.status).toBe("error");
    expect(loader.getState().status).toBe("error");
    expect(loader.getTasks().map((item) => item.id)).toEqual(["one"]);
  });
  it("does not double-fetch when loadMore is called twice while a page is in flight", async () => {
    let calls = 0;
    let resolvePage:
      | ((value: { items: ReturnType<typeof task>[]; nextCursor: string | null }) => void)
      | undefined;
    const loader = new TaskPageLoader({
      fetchPage: async () => {
        calls += 1;
        return new Promise((resolve) => {
          resolvePage = resolve;
        });
      },
    });
    const first = loader.loadMore();
    const second = await loader.loadMore();
    expect(second.status).toBe("loading");
    expect(calls).toBe(1);
    resolvePage?.({ items: [task("one")], nextCursor: null });
    await first;
    expect(loader.getTasks()).toHaveLength(1);
  });
  it("does not fetch more after completion", async () => {
    let calls = 0;
    const loader = new TaskPageLoader({
      fetchPage: async () => {
        calls += 1;
        return { items: [], nextCursor: null };
      },
    });
    await loader.loadMore();
    await loader.loadMore();
    expect(calls).toBe(1);
  });
});
