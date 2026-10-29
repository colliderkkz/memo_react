"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Globe, Lock } from "lucide-react";
import { Button } from "@/lib/ui";
import { apiImportXPost } from "@/lib/services/memos.ts";
import { showToast } from "@/lib/state/toast.ts";
import type { MemoVisibility } from "@/lib/types.ts";

export function XImportForm() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [visibility, setVisibility] = useState<MemoVisibility>("private");
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState("");

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!url.trim() || importing) return;

    setImporting(true);
    setError("");
    apiImportXPost(url, visibility).then(
      (result) => {
        if (!result.success) {
          setError(result.error);
          setImporting(false);
          return;
        }
        router.refresh();
        setUrl("");
        setImporting(false);
        showToast("success", "X post imported to favorites");
      },
      () => {
        setError("Could not reach the X import service.");
        setImporting(false);
      },
    );
  }

  return (
    <form className="mb-8" onSubmit={submit}>
      <div className="flex gap-2">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          type="url"
          inputMode="url"
          autoComplete="off"
          placeholder="Paste an X post URL..."
          aria-label="X post URL"
          className="min-w-0 flex-1 h-9 px-3 rounded border border-border bg-background text-sm
            text-foreground placeholder:text-muted-foreground outline-none
            focus:border-accent transition-colors"
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="gap-1.5 font-normal text-muted-foreground max-sm:px-2"
          onClick={() => setVisibility(visibility === "private" ? "public" : "private")}
          aria-label={`Import visibility: ${visibility}`}
          title={`Import as ${visibility}`}
        >
          {visibility === "private" ? <Lock size={12} /> : <Globe size={12} />}
          <span className="hidden sm:inline">
            {visibility === "private" ? "Private" : "Public"}
          </span>
        </Button>
        <Button type="submit" variant="outline" size="sm" disabled={!url.trim() || importing}>
          {importing ? "Importing..." : "Import"}
        </Button>
      </div>
      {error ? <p className="mt-2 text-xs text-error">{error}</p> : null}
    </form>
  );
}
