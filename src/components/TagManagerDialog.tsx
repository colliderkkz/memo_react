"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Pencil, Tags, Trash2, X } from "lucide-react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Input,
} from "@/lib/ui";
import { apiDeleteTag, apiRenameTag } from "@/lib/services/tags.ts";
import { showToast } from "@/lib/state/toast.ts";
import type { TagCount } from "@/lib/types.ts";

export interface TagManagerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tags: TagCount[];
}

export function TagManagerDialog({ open, onOpenChange, tags }: TagManagerDialogProps) {
  const router = useRouter();
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function startRename(name: string) {
    setEditing(name);
    setDraft(name);
    setConfirmingDelete(null);
  }

  async function commitRename(from: string) {
    const to = draft.trim().toLowerCase();
    if (!to || to === from || busy) {
      setEditing(null);
      return;
    }
    setBusy(true);
    try {
      const { updated } = await apiRenameTag(from, to);
      showToast("success", "标签已重命名", `#${from} → #${to}，更新了 ${updated} 条备忘录`);
      setEditing(null);
      router.refresh();
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "重命名失败");
    } finally {
      setBusy(false);
    }
  }

  async function commitDelete(name: string) {
    if (busy) return;
    setBusy(true);
    try {
      const { updated } = await apiDeleteTag(name);
      showToast("success", "标签已删除", `已从 ${updated} 条备忘录中移除 #${name}`);
      setConfirmingDelete(null);
      router.refresh();
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "删除失败");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-label="标签管理" className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tags size={16} className="text-accent" />
            标签管理
          </DialogTitle>
          <DialogDescription className="mt-1.5">
            重命名或删除会同步更新所有相关备忘录正文里的 #话题 文字。
          </DialogDescription>
        </DialogHeader>

        <div className="-mx-1 mt-2 max-h-80 space-y-1 overflow-y-auto px-1">
          {tags.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              还没有标签——在备忘录里写 #标签名 即可创建
            </p>
          ) : null}
          {tags.map(({ name, count }) => (
            <div
              key={name}
              className="flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5"
            >
              {editing === name ? (
                <>
                  <Input
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    className="h-7 flex-1 text-sm"
                    placeholder="新标签名"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") void commitRename(name);
                      if (e.key === "Escape") setEditing(null);
                    }}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0"
                    disabled={busy}
                    onClick={() => void commitRename(name)}
                    aria-label="确认重命名"
                  >
                    {busy ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0"
                    disabled={busy}
                    onClick={() => setEditing(null)}
                    aria-label="取消"
                  >
                    <X size={13} />
                  </Button>
                </>
              ) : confirmingDelete === name ? (
                <>
                  <span className="flex-1 text-sm">
                    删除 <strong>#{name}</strong>？将从 {count} 条备忘录中移除
                  </span>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="h-7 shrink-0"
                    disabled={busy}
                    onClick={() => void commitDelete(name)}
                  >
                    {busy ? <Loader2 size={13} className="animate-spin" /> : "删除"}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 shrink-0"
                    disabled={busy}
                    onClick={() => setConfirmingDelete(null)}
                  >
                    取消
                  </Button>
                </>
              ) : (
                <>
                  <span className="flex-1 truncate text-sm">#{name}</span>
                  <span className="font-mono text-xs text-muted-foreground">{count}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0 text-muted-foreground"
                    onClick={() => startRename(name)}
                    aria-label="重命名标签"
                  >
                    <Pencil size={13} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0 text-muted-foreground hover:text-error"
                    onClick={() => {
                      setConfirmingDelete(name);
                      setEditing(null);
                    }}
                    aria-label="删除标签"
                  >
                    <Trash2 size={13} />
                  </Button>
                </>
              )}
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
