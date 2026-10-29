import fs from "node:fs/promises";
import path from "node:path";
import type { BucketObject, MemoBucket } from "./types.ts";

const META_SUFFIX = ".meta.json";

function isEnoent(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { code?: string }).code === "ENOENT";
}

export function toBytes(value: string | ArrayBuffer | ArrayBufferView): Buffer {
  if (typeof value === "string") return Buffer.from(value, "utf8");
  if (value instanceof ArrayBuffer) return Buffer.from(new Uint8Array(value));
  return Buffer.from(new Uint8Array(value.buffer, value.byteOffset, value.byteLength));
}

/**
 * Filesystem-backed replacement for the R2 bucket.
 * Layout: <root>/<key> for object bytes, <root>/<key>.meta.json sidecar
 * holding { contentType } when the writer supplied httpMetadata.
 */
export class FileSystemBucket implements MemoBucket {
  root: string;

  constructor(root: string) {
    this.root = path.resolve(root);
  }

  private resolveKey(key: string): string {
    if (!key || key.startsWith("/") || key.includes("..") || key.includes("\\")) {
      throw new Error(`Invalid bucket key: ${key}`);
    }
    const resolved = path.resolve(this.root, key.split("/").join(path.sep));
    if (resolved !== this.root && !resolved.startsWith(this.root + path.sep)) {
      throw new Error(`Invalid bucket key: ${key}`);
    }
    return resolved;
  }

  private async readMeta(file: string): Promise<string | undefined> {
    try {
      const raw = await fs.readFile(file + META_SUFFIX, "utf8");
      const parsed = JSON.parse(raw) as { contentType?: unknown };
      return typeof parsed.contentType === "string" && parsed.contentType
        ? parsed.contentType
        : undefined;
    } catch {
      return undefined;
    }
  }

  async get(key: string): Promise<BucketObject | null> {
    const file = this.resolveKey(key);
    let buf: Buffer;
    try {
      buf = await fs.readFile(file);
    } catch (err) {
      if (isEnoent(err)) return null;
      throw err;
    }
    const contentType = await this.readMeta(file);
    return {
      key,
      body: new Uint8Array(buf),
      text: async () => buf.toString("utf8"),
      arrayBuffer: async () =>
        buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer,
      ...(contentType ? { httpMetadata: { contentType } } : {}),
    };
  }

  async put(
    key: string,
    value: string | ArrayBuffer | ArrayBufferView,
    opts?: { httpMetadata?: { contentType?: string } },
  ): Promise<void> {
    const file = this.resolveKey(key);
    await fs.mkdir(path.dirname(file), { recursive: true });
    const tmp = `${file}.${process.pid}.${Date.now()}.tmp`;
    await fs.writeFile(tmp, toBytes(value));
    await fs.rename(tmp, file);
    if (opts?.httpMetadata?.contentType) {
      await fs.writeFile(
        file + META_SUFFIX,
        JSON.stringify({ contentType: opts.httpMetadata.contentType }),
      );
    } else {
      await fs.rm(file + META_SUFFIX, { force: true });
    }
  }

  async delete(key: string): Promise<void> {
    const file = this.resolveKey(key);
    await fs.rm(file, { force: true });
    await fs.rm(file + META_SUFFIX, { force: true });
  }

  async head(key: string): Promise<{ key: string; size: number } | null> {
    const file = this.resolveKey(key);
    try {
      const stat = await fs.stat(file);
      return { key, size: stat.size };
    } catch (err) {
      if (isEnoent(err)) return null;
      throw err;
    }
  }
}
