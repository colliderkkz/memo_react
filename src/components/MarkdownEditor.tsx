"use client";

import { useRef, useState, type RefObject } from "react";
import { ImagePlus, Loader2 } from "lucide-react";
import { cn } from "@/lib/ui";
import { apiUploadImage } from "@/lib/services/uploads.ts";
import { showToast } from "@/lib/state/toast.ts";

export interface MarkdownEditorProps {
  value: string;
  onTextChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onBlur?: () => void;
  /** 父组件持有 textarea 引用（用于标签自动补全的光标定位等） */
  editorRef?: RefObject<HTMLTextAreaElement | null>;
}

export function MarkdownEditor({
  value,
  onTextChange,
  placeholder = "",
  className,
  onKeyDown,
  onBlur,
  editorRef,
}: MarkdownEditorProps) {
  const internalRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const el = () => editorRef?.current ?? internalRef.current;
  const mergedRef = (node: HTMLTextAreaElement | null) => {
    internalRef.current = node;
    if (editorRef) editorRef.current = node;
  };

  function insertAtCursor(text: string) {
    const node = el();
    const start = node?.selectionStart ?? value.length;
    const end = node?.selectionEnd ?? start;
    const next = value.slice(0, start) + text + value.slice(end);
    onTextChange(next);
    requestAnimationFrame(() => {
      if (!node) return;
      const pos = start + text.length;
      node.focus();
      node.setSelectionRange(pos, pos);
    });
  }

  async function uploadFiles(files: FileList | File[]) {
    if (uploading) return;
    const images = Array.from(files).filter((file) => file.type.startsWith("image/"));
    if (images.length === 0) return;

    setUploading(true);
    try {
      for (const file of images) {
        const url = await apiUploadImage(file);
        const alt = file.name.replace(/\.[^.]+$/, "").replace(/[\[\]]/g, "");
        insertAtCursor(`![${alt}](${url})\n`);
      }
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "图片上传失败");
    } finally {
      setUploading(false);
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLTextAreaElement>) {
    const files = e.clipboardData?.files;
    if (files && Array.from(files).some((file) => file.type.startsWith("image/"))) {
      e.preventDefault();
      void uploadFiles(files);
    }
  }

  function handleDrop(e: React.DragEvent<HTMLTextAreaElement>) {
    e.preventDefault();
    const files = e.dataTransfer?.files;
    if (files?.length) void uploadFiles(files);
  }

  return (
    <div className="relative">
      <textarea
        ref={mergedRef}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onTextChange(e.target.value)}
        onKeyDown={onKeyDown}
        onPaste={handlePaste}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        onBlur={onBlur}
        className={cn("md-editor", className)}
      />

      <button
        type="button"
        title="上传图片（也可直接粘贴截图或拖入图片文件）"
        aria-label="上传图片"
        disabled={uploading}
        onClick={() => fileInputRef.current?.click()}
        className="absolute bottom-2 right-2 flex h-7 w-7 items-center justify-center rounded
          text-muted-foreground bg-background/70 opacity-70 transition-all
          hover:opacity-100 hover:text-foreground hover:bg-muted active:scale-90
          disabled:opacity-100 disabled:cursor-wait"
      >
        {uploading ? <Loader2 size={15} className="animate-spin" /> : <ImagePlus size={15} />}
      </button>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/gif,image/webp,image/avif"
        multiple
        className="hidden"
        onChange={(e) => {
          const input = e.currentTarget;
          if (input.files?.length) void uploadFiles(input.files);
          input.value = "";
        }}
      />
    </div>
  );
}
