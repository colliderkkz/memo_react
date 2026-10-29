"use client";

import { useSyncExternalStore } from "react";
import { apiDeleteMemo, apiUpdateMemo, memoSchema } from "@/lib/services/memos.ts";
import { showToast } from "@/lib/state/toast.ts";
import type { Memo, MemoVisibility } from "@/lib/types.ts";
import { z } from "zod";

type Listener = () => void;

/** 极简 observable store（对应原 runes $state；快照不可变，供 useSyncExternalStore 使用） */
export function createStore<S extends object>(initial: S) {
  let state: S = { ...initial };
  const listeners = new Set<Listener>();
  return {
    get: (): S => state,
    set: (patch: Partial<S>) => {
      state = { ...state, ...patch };
      for (const listener of listeners) listener();
    },
    subscribe: (fn: Listener) => {
      listeners.add(fn);
      return () => {
        listeners.delete(fn);
      };
    },
  };
}

export type Store<S extends object> = ReturnType<typeof createStore<S>>;

export function useStore<S extends object>(store: Store<S>): S {
  return useSyncExternalStore(store.subscribe, store.get, store.get);
}

/** refresh 对应原 invalidateAll()：调用方传入 () => router.refresh() */
export type RefreshFn = () => void;

// ---- 编辑 ----

export interface EditActionsState {
  editingId: string | null;
  editContent: string;
  editVisibility: MemoVisibility;
  isUpdating: boolean;
}

export function createEditActions(refresh: RefreshFn) {
  const store = createStore<EditActionsState>({
    editingId: null,
    editContent: "",
    editVisibility: "private",
    isUpdating: false,
  });
  let savedContent = "";
  let savedVisibility: MemoVisibility = "private";

  async function start(memo: Memo) {
    const s = store.get();
    if (s.editingId === memo.id || s.isUpdating) return;

    if (s.editingId && !(await save(s.editingId))) return;

    const response = await fetch(`/api/memos/${memo.id}`);
    if (!response.ok) {
      showToast("error", `Failed to load memo (${response.status})`);
      return;
    }
    const latest = z.object({ memo: memoSchema }).parse(await response.json()).memo;
    store.set({
      editingId: latest.id,
      editContent: latest.content,
      editVisibility: latest.visibility,
    });
    savedContent = latest.content;
    savedVisibility = latest.visibility;
  }

  function cancel() {
    if (store.get().isUpdating) return;
    store.set({ editingId: null, editContent: "" });
    savedContent = "";
  }

  async function save(id: string): Promise<boolean> {
    const s = store.get();
    if (s.editingId !== id || !s.editContent.trim() || s.isUpdating) return false;

    if (s.editContent === savedContent && s.editVisibility === savedVisibility) {
      cancel();
      return true;
    }

    store.set({ isUpdating: true });
    return apiUpdateMemo(id, { content: s.editContent, visibility: s.editVisibility }).then(
      () => {
        store.set({ editingId: null, editContent: "", isUpdating: false });
        savedContent = "";
        refresh();
        showToast("success", "Memo updated");
        return true;
      },
      () => {
        store.set({ isUpdating: false });
        showToast("error", "Failed to update memo");
        return false;
      },
    );
  }

  return {
    store,
    start,
    cancel,
    save,
    setEditContent(v: string) {
      store.set({ editContent: v });
    },
    setEditVisibility(v: MemoVisibility) {
      store.set({ editVisibility: v });
    },
  };
}

export type EditActions = ReturnType<typeof createEditActions>;

// ---- 删除 ----

export interface DeleteActionsState {
  pendingDeleteId: string | null;
  showDeleteDialog: boolean;
  isDeleting: boolean;
}

export function createDeleteActions(refresh: RefreshFn) {
  const store = createStore<DeleteActionsState>({
    pendingDeleteId: null,
    showDeleteDialog: false,
    isDeleting: false,
  });

  function request(id: string) {
    store.set({ pendingDeleteId: id, showDeleteDialog: true });
  }

  function cancel() {
    store.set({ showDeleteDialog: false, pendingDeleteId: null });
  }

  function confirm() {
    const s = store.get();
    if (!s.pendingDeleteId || s.isDeleting) return;
    store.set({ isDeleting: true });
    apiDeleteMemo(s.pendingDeleteId)
      .then(() => {
        store.set({ showDeleteDialog: false, pendingDeleteId: null, isDeleting: false });
        refresh();
        showToast("success", "Memo deleted");
      })
      .catch((err: unknown) => {
        store.set({ showDeleteDialog: false, isDeleting: false });
        showToast("error", "Failed to delete memo", err instanceof Error ? err.message : undefined);
      });
  }

  return {
    store,
    request,
    cancel,
    confirm,
    setShowDeleteDialog(v: boolean) {
      store.set({ showDeleteDialog: v });
    },
  };
}

export type DeleteActions = ReturnType<typeof createDeleteActions>;

// ---- 置顶 ----

export interface PinActionsState {
  pinningId: string | null;
}

export function createPinActions(refresh: RefreshFn) {
  const store = createStore<PinActionsState>({ pinningId: null });

  function toggle(memo: Memo) {
    if (store.get().pinningId) return;
    store.set({ pinningId: memo.id });
    const willPin = !memo.pinned;
    apiUpdateMemo(memo.id, { pinned: willPin })
      .then(() => {
        store.set({ pinningId: null });
        refresh();
        showToast("success", willPin ? "Memo pinned" : "Memo unpinned");
      })
      .catch((err: unknown) => {
        store.set({ pinningId: null });
        showToast("error", "Failed to update memo", err instanceof Error ? err.message : undefined);
      });
  }

  return { store, toggle };
}

export type PinActions = ReturnType<typeof createPinActions>;

// ---- 收藏 ----

export interface FavoriteActionsState {
  favoritingId: string | null;
}

export function createFavoriteActions(refresh: RefreshFn) {
  const store = createStore<FavoriteActionsState>({ favoritingId: null });

  function toggle(memo: Memo) {
    if (store.get().favoritingId) return;
    store.set({ favoritingId: memo.id });
    const willFavorite = !memo.favorite;
    apiUpdateMemo(memo.id, { favorite: willFavorite }).then(
      () => {
        store.set({ favoritingId: null });
        refresh();
        showToast(
          "success",
          willFavorite ? "Memo added to favorites" : "Memo unfavorited",
        );
      },
      () => {
        store.set({ favoritingId: null });
        showToast("error", "Failed to update memo");
      },
    );
  }

  return { store, toggle };
}

export type FavoriteActions = ReturnType<typeof createFavoriteActions>;

// ---- 归档 / 恢复 ----

export interface ArchiveActionsState {
  archivingId: string | null;
}

export function createArchiveActions(refresh: RefreshFn) {
  const store = createStore<ArchiveActionsState>({ archivingId: null });

  function archive(id: string) {
    if (store.get().archivingId) return;
    store.set({ archivingId: id });
    apiUpdateMemo(id, { archived: true })
      .then(() => {
        store.set({ archivingId: null });
        refresh();
        showToast("success", "Memo archived");
      })
      .catch((err: unknown) => {
        store.set({ archivingId: null });
        showToast(
          "error",
          "Failed to archive memo",
          err instanceof Error ? err.message : undefined,
        );
      });
  }

  return { store, archive };
}

export type ArchiveActions = ReturnType<typeof createArchiveActions>;

export interface RestoreActionsState {
  restoringId: string | null;
}

export function createRestoreActions(refresh: RefreshFn) {
  const store = createStore<RestoreActionsState>({ restoringId: null });

  function restore(id: string) {
    store.set({ restoringId: id });
    apiUpdateMemo(id, { archived: false })
      .then(() => {
        store.set({ restoringId: null });
        refresh();
        showToast("success", "Memo restored");
      })
      .catch((err: unknown) => {
        store.set({ restoringId: null });
        showToast(
          "error",
          "Failed to restore memo",
          err instanceof Error ? err.message : undefined,
        );
      });
  }

  return { store, restore };
}

export type RestoreActions = ReturnType<typeof createRestoreActions>;
