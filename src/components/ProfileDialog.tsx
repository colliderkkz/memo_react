"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import {
  Avatar,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Input,
} from "@/lib/ui";
import {
  apiResetAvatar,
  apiUpdateProfileName,
  apiUploadAvatar,
} from "@/lib/services/profile.ts";
import { showToast } from "@/lib/state/toast.ts";
import type { CurrentUser } from "@/lib/server/current-user.ts";

export interface ProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: CurrentUser | null;
}

export function ProfileDialog({ open, onOpenChange, user }: ProfileDialogProps) {
  const router = useRouter();
  const [nameDraft, setNameDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const avatarUrl = user?.image ?? null;
  const currentName = user?.name ?? "Owner";

  useEffect(() => {
    if (open) setNameDraft(currentName);
  }, [open, currentName]);

  async function saveName() {
    const name = nameDraft.trim();
    if (!name || name === currentName || busy) return;
    setBusy(true);
    try {
      await apiUpdateProfileName(name);
      showToast("success", "名字已更新");
      router.refresh();
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "更新失败");
    } finally {
      setBusy(false);
    }
  }

  async function uploadAvatar(file: File) {
    if (busy) return;
    setBusy(true);
    try {
      await apiUploadAvatar(file);
      showToast("success", "头像已更新");
      router.refresh();
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "上传失败");
    } finally {
      setBusy(false);
    }
  }

  async function resetAvatar() {
    if (busy) return;
    setBusy(true);
    try {
      await apiResetAvatar();
      showToast("success", "头像已移除，恢复名字缩写");
      router.refresh();
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "移除失败");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-label="编辑资料" className="max-w-sm">
        <DialogHeader>
          <DialogTitle>编辑资料</DialogTitle>
          <DialogDescription className="mt-1.5">
            头像和名字会显示在顶栏与旧版侧栏。
          </DialogDescription>
        </DialogHeader>

        <div className="mt-2 flex flex-col items-center gap-3">
          <Avatar src={avatarUrl ?? undefined} fallback={nameDraft || currentName} size="xl" />

          <div className="flex gap-1.5">
            <Button
              variant="outline"
              size="sm"
              className="h-7"
              disabled={busy}
              onClick={() => fileInputRef.current?.click()}
            >
              <ImagePlus size={13} />
              换头像
            </Button>
            {avatarUrl ? (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-muted-foreground"
                disabled={busy}
                onClick={() => void resetAvatar()}
              >
                <Trash2 size={13} />
                移除
              </Button>
            ) : null}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/gif,image/webp,image/avif"
            className="hidden"
            onChange={(e) => {
              const input = e.currentTarget;
              const file = input.files?.[0];
              if (file) void uploadAvatar(file);
              input.value = "";
            }}
          />

          <Input
            value={nameDraft}
            onChange={(e) => setNameDraft(e.target.value)}
            className="w-full text-sm"
            placeholder="名字"
            maxLength={40}
            onKeyDown={(e) => {
              if (e.key === "Enter") void saveName();
            }}
          />

          <Button
            className="w-full"
            size="sm"
            disabled={busy || nameDraft.trim().length === 0 || nameDraft.trim() === currentName}
            onClick={() => void saveName()}
          >
            {busy ? <Loader2 size={13} className="animate-spin" /> : "保存名字"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
