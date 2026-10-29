import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import type { Memo } from "@/lib/types.ts";

const { apiUpdateMemo } = vi.hoisted(() => ({
  apiUpdateMemo: vi.fn(),
}));

vi.mock("@/lib/services/memos.ts", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/services/memos.ts")>();
  return { ...original, apiUpdateMemo };
});
vi.mock("@/lib/state/toast.ts", () => ({ showToast: vi.fn() }));

import { createEditActions } from "@/lib/state/memo-actions.ts";

const firstMemo = {
  id: "first",
  r2Key: "memos/2026/08/first.md",
  content: "Original",
  tags: [],
  createdAt: "2026-08-20T00:00:00.000Z",
  updatedAt: "2026-08-20T00:00:00.000Z",
  visibility: "private",
  pinned: false,
  favorite: false,
  archived: false,
} satisfies Memo;

const secondMemo = {
  ...firstMemo,
  id: "second",
  r2Key: "memos/2026/08/second.md",
  content: "Second",
} satisfies Memo;

describe("memo edit actions", () => {
  let refresh: Mock<() => void>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", vi.fn());
    refresh = vi.fn();
  });

  it("saves the current draft before opening another memo", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(Response.json({ memo: firstMemo }))
      .mockResolvedValueOnce(Response.json({ memo: secondMemo }));
    apiUpdateMemo.mockResolvedValue(undefined);

    const edit = createEditActions(refresh);
    await edit.start(firstMemo);
    edit.setEditContent("Changed");
    await edit.start(secondMemo);

    expect(apiUpdateMemo).toHaveBeenCalledWith("first", {
      content: "Changed",
      visibility: "private",
    });
    expect(refresh).toHaveBeenCalledOnce();
    expect(edit.store.get().editingId).toBe("second");
    expect(edit.store.get().editContent).toBe("Second");
  });

  it("keeps the current draft when autosave fails", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(Response.json({ memo: firstMemo }));
    apiUpdateMemo.mockRejectedValue(new Error("offline"));

    const edit = createEditActions(refresh);
    await edit.start(firstMemo);
    edit.setEditContent("Changed");
    await edit.start(secondMemo);

    expect(fetch).toHaveBeenCalledOnce();
    expect(edit.store.get().editingId).toBe("first");
    expect(edit.store.get().editContent).toBe("Changed");
  });
});
