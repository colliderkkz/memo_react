import { describe, expect, it } from "vitest";
import {
  MAX_UPLOAD_BYTES,
  UPLOAD_NAME_RE,
  contentTypeForName,
  createUploadName,
  extForContentType,
  uploadR2Key,
} from "@/lib/server/uploads.ts";

describe("upload helpers", () => {
  it("maps allowed image content types to extensions", () => {
    expect(extForContentType("image/png")).toBe("png");
    expect(extForContentType("IMAGE/JPEG")).toBe("jpg");
    expect(extForContentType("image/webp")).toBe("webp");
    expect(extForContentType("image/svg+xml")).toBeNull();
    expect(extForContentType("text/plain")).toBeNull();
  });

  it("generates names that pass the serving route's validation", () => {
    for (const ext of ["png", "jpg", "gif", "webp", "avif"]) {
      const name = createUploadName(ext);
      expect(name).toMatch(UPLOAD_NAME_RE);
      expect(uploadR2Key(name)).toBe(`uploads/${name}`);
    }
  });

  it("rejects unsafe names", () => {
    expect(UPLOAD_NAME_RE.test("../etc/passwd")).toBe(false);
    expect(UPLOAD_NAME_RE.test("evil-deadbeef.svg")).toBe(false);
    expect(UPLOAD_NAME_RE.test("no-random.png")).toBe(false);
    expect(UPLOAD_NAME_RE.test("UPPER-deadbeef.png")).toBe(false);
  });

  it("resolves content types when serving", () => {
    expect(contentTypeForName("abc-deadbeef.jpg")).toBe("image/jpeg");
    expect(contentTypeForName("abc-deadbeef.bin")).toBeNull();
  });

  it("caps upload size at 10 MB", () => {
    expect(MAX_UPLOAD_BYTES).toBe(10 * 1024 * 1024);
  });
});
