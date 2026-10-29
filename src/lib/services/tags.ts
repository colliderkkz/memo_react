async function extractError(res: Response): Promise<string> {
  const data = (await res.json().catch(() => null)) as { error?: string } | null;
  return data?.error ?? `请求失败（HTTP ${res.status}）`;
}

function tagUrl(name: string): string {
  return `/api/tags/${name.split("/").map(encodeURIComponent).join("/")}`;
}

export async function apiRenameTag(from: string, to: string): Promise<{ updated: number }> {
  const res = await fetch(tagUrl(from), {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: to }),
  });
  if (!res.ok) throw new Error(await extractError(res));
  return (await res.json()) as { updated: number };
}

export async function apiDeleteTag(name: string): Promise<{ updated: number }> {
  const res = await fetch(tagUrl(name), { method: "DELETE" });
  if (!res.ok) throw new Error(await extractError(res));
  return (await res.json()) as { updated: number };
}
