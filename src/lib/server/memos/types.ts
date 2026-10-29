import type { Memo, MemoStats, MemoVisibility, TagCount } from "@/lib/types.ts";
export type { Memo, MemoStats, MemoVisibility, TagCount };

export interface MemoListFilters {
  search?: string;
  date?: string;
  archivedOnly?: boolean;
  favoritesOnly?: boolean;
  tags?: string[];
  publicOnly?: boolean;
  sortByUpdated?: boolean;
  cursor?: string;
  limit?: number;
}

export interface MemoPage {
  memos: Memo[];
  nextCursor: string | null;
}

export interface CreateMemoInput {
  content: string;
  visibility: import("@/lib/types.ts").MemoVisibility;
  tags: string[];
  favorite: boolean;
}

export interface UpdateMemoInput {
  content?: string;
  visibility?: import("@/lib/types.ts").MemoVisibility;
  tags?: string[];
  pinned?: boolean;
  favorite?: boolean;
  archived?: boolean;
}

export class MemoError extends Error {
  constructor(
    readonly code: "not_found",
    message: string,
  ) {
    super(message);
    this.name = "MemoError";
  }
}
