"use client";

import { useSyncExternalStore } from "react";
import type { ToastVariant } from "@/lib/ui";

export interface ToastItem {
  id: string;
  variant: ToastVariant;
  title: string;
  description?: string;
}

// 模块级 vanilla store（对应原 toast.svelte.ts 的 $state 数组）
let items: ToastItem[] = [];
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

export function subscribeToasts(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function getToastsSnapshot(): ToastItem[] {
  return items;
}

export function showToast(variant: ToastVariant, title: string, description?: string) {
  const id = Math.random().toString(36).slice(2, 9);
  items = [...items, { id, variant, title, description }];
  emit();
  setTimeout(() => dismiss(id), 4000);
}

export function dismiss(id: string) {
  const idx = items.findIndex((t) => t.id === id);
  if (idx !== -1) {
    items = items.filter((t) => t.id !== id);
    emit();
  }
}

export function useToasts(): ToastItem[] {
  return useSyncExternalStore(subscribeToasts, getToastsSnapshot, getToastsSnapshot);
}
