async function extractError(res: Response): Promise<string> {
  const data = (await res.json().catch(() => null)) as { error?: string } | null;
  return data?.error ?? `请求失败（HTTP ${res.status}）`;
}

export async function apiGetQuote(): Promise<string | null> {
  const res = await fetch("/api/settings/quote");
  if (!res.ok) throw new Error(await extractError(res));
  const data = (await res.json()) as { text: string | null };
  return data.text;
}

export async function apiSaveQuote(text: string): Promise<string> {
  const res = await fetch("/api/settings/quote", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) throw new Error(await extractError(res));
  const data = (await res.json()) as { text: string };
  return data.text;
}

export async function apiResetQuote(): Promise<void> {
  const res = await fetch("/api/settings/quote", { method: "DELETE" });
  if (!res.ok) throw new Error(await extractError(res));
}
