async function extractError(res: Response): Promise<string> {
  const data = (await res.json().catch(() => null)) as { error?: string } | null;
  return data?.error ?? `请求失败（HTTP ${res.status}）`;
}

export async function apiUpdateProfileName(name: string): Promise<string> {
  const res = await fetch("/api/profile", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) throw new Error(await extractError(res));
  const data = (await res.json()) as { name: string };
  return data.name;
}

export async function apiUploadAvatar(file: File): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch("/api/profile/avatar", { method: "POST", body: form });
  if (!res.ok) throw new Error(await extractError(res));
  const data = (await res.json()) as { url: string };
  return data.url;
}

export async function apiResetAvatar(): Promise<void> {
  const res = await fetch("/api/profile/avatar", { method: "DELETE" });
  if (!res.ok) throw new Error(await extractError(res));
}
