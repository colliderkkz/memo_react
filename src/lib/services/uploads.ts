export async function apiUploadImage(file: File): Promise<string> {
  const form = new FormData();
  form.append("file", file);

  const response = await fetch("/api/uploads", { method: "POST", body: form });
  if (!response.ok) {
    const data = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(data?.error ?? `图片上传失败（HTTP ${response.status}）`);
  }

  const data = (await response.json()) as { url: string };
  return data.url;
}
