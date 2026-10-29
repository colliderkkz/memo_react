import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MemoBucket, MemoCache, MemoDatabase } from "@/lib/server/bindings/types.ts";
import { invalidateMemoOgCache } from "@/lib/server/memos/cache.ts";
import { findMemoRow, updateMemoRow } from "@/lib/server/memos/repository.ts";
import { updateMemo } from "@/lib/server/memos/service.ts";
import { readMemoBody, writeMemoBody } from "@/lib/server/memos/storage.ts";

vi.mock("@/lib/server/memos/cache.ts", () => ({
  invalidateMemoOgCache: vi.fn(),
}));

vi.mock("@/lib/server/memos/repository.ts", () => ({
  deleteMemoRow: vi.fn(),
  findMemoRow: vi.fn(),
  insertMemoRow: vi.fn(),
  memoFromRow: vi.fn((row) => ({
    id: row.id,
    content: row.excerpt,
    tags: row.tagsJson,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    visibility: row.visibility,
    pinned: row.pinned,
    favorite: row.favorite,
    archived: row.archived,
  })),
  queryTagCounts: vi.fn(),
  updateMemoRow: vi.fn(),
}));

vi.mock("@/lib/server/memos/storage.ts", () => ({
  deleteMemoBody: vi.fn(),
  readMemoBody: vi.fn(),
  writeMemoBody: vi.fn(),
}));

const memoRow = {
  id: "20260803T000000Z-12345678",
  r2Key: "memos/2026/08/memo.md",
  tagsJson: ["old"],
  excerpt: "Body\n\n#old",
  createdAt: "2026-08-03T00:00:00.000Z",
  updatedAt: "2026-08-03T00:00:00.000Z",
  visibility: "private" as const,
  pinned: false,
  favorite: false,
  archived: false,
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(findMemoRow).mockResolvedValue(memoRow);
  vi.mocked(readMemoBody).mockResolvedValue("Body\n\n#old");
  vi.mocked(updateMemoRow).mockResolvedValue({
    ...memoRow,
    excerpt: "Body\n\n#new",
    tagsJson: ["new"],
  });
});

describe("memo service", () => {
  it("keeps the R2 body and D1 mirror synchronized for tag-only updates", async () => {
    const memo = await updateMemo(
      {} as MemoDatabase,
      {} as MemoBucket,
      {} as MemoCache,
      memoRow.id,
      {
      tags: ["new"],
    });

    expect(writeMemoBody).toHaveBeenCalledWith(expect.anything(), memoRow.r2Key, "Body\n\n#new");
    expect(updateMemoRow).toHaveBeenCalledWith(
      expect.anything(),
      memoRow.id,
      expect.objectContaining({ excerpt: "Body\n\n#new", tagsJson: ["new"] }),
    );
    expect(invalidateMemoOgCache).toHaveBeenCalledWith(expect.anything(), memoRow.id);
    expect(memo.tags).toEqual(["new"]);
  });
});
