export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
export const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

const EXT_BY_CONTENT_TYPE: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/gif": "gif",
  "image/webp": "webp",
  "image/avif": "avif",
};

const CONTENT_TYPE_BY_EXT: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  avif: "image/avif",
};

export const UPLOAD_NAME_RE = /^[0-9a-z]+-[0-9a-f]{8}\.(png|jpg|gif|webp|avif)$/;

export function extForContentType(contentType: string): string | null {
  return EXT_BY_CONTENT_TYPE[contentType.toLowerCase()] ?? null;
}

export function contentTypeForName(name: string): string | null {
  const ext = name.split(".").pop()?.toLowerCase();
  return (ext && CONTENT_TYPE_BY_EXT[ext]) || null;
}

export function createUploadName(ext: string, now = new Date()): string {
  const stamp = now.getTime().toString(36);
  const random = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
  return `${stamp}-${random}.${ext}`;
}

export function uploadR2Key(name: string): string {
  return `uploads/${name}`;
}
