import { describe, expect, it } from "vitest";
import {
  isMemoSearchWithinLimit,
  isValidMemoDate,
  MAX_MEMO_SEARCH_BYTES,
} from "@/lib/server/memos/validation.ts";

describe("memo filter validation", () => {
  it("measures search input in UTF-8 bytes", () => {
    expect(MAX_MEMO_SEARCH_BYTES).toBe(48);
    expect(isMemoSearchWithinLimit("a".repeat(48))).toBe(true);
    expect(isMemoSearchWithinLimit("a".repeat(49))).toBe(false);
    expect(isMemoSearchWithinLimit("备忘录".repeat(5) + "备")).toBe(true);
    expect(isMemoSearchWithinLimit("备忘录".repeat(5) + "备忘")).toBe(false);
  });

  it("rejects impossible calendar dates", () => {
    expect(isValidMemoDate("2024-02-29")).toBe(true);
    expect(isValidMemoDate("2025-02-29")).toBe(false);
    expect(isValidMemoDate("2025-13-01")).toBe(false);
    expect(isValidMemoDate("2025-1-01")).toBe(false);
  });
});
