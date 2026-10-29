export type NextSearchParams = Record<string, string | string[] | undefined>;

/** Next.js 页面的 searchParams（Promise 解出后）→ URL，供 parsePageFilters 复用。 */
export function urlFromSearchParams(
  searchParams: NextSearchParams,
  base = "http://localhost",
): URL {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (typeof value === "string") qs.set(key, value);
    else if (Array.isArray(value)) for (const item of value) qs.append(key, item);
  }
  return new URL(`${base}?${qs.toString()}`);
}
