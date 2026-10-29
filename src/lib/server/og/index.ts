import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { Resvg, initWasm } from "@resvg/resvg-wasm";
import { OG_FONT_FAMILIES, loadOgFonts } from "./fonts";
import type { MemoCache } from "@/lib/server/bindings/types.ts";

// The fixed part of every card: the rose wash, the illustration card and the handwritten name.
// Read from disk and memoized (replaces the old Vite `?inline` data-URI import).
let baseDataUriCache: string | null = null;
function getBaseDataUri(): string {
  if (!baseDataUriCache) {
    const bytes = fs.readFileSync(path.join(process.cwd(), "src/lib/server/og/base.jpg"));
    baseDataUriCache = `data:image/jpeg;base64,${bytes.toString("base64")}`;
  }
  return baseDataUriCache;
}

const OG_WIDTH = 1200;
const OG_HEIGHT = 630;

// Tints of the brand 蘇芳 rose (#963c5a), matching the base image.
const palette = {
  fog: "#8b6976",
  ink: "#2a161d",
} as const;

const fontFamily = {
  sans: '"Noto Sans SC", system-ui, "PingFang SC", "Microsoft YaHei", sans-serif',
  kai: '"LXGW WenKai TC", "Noto Sans SC", "PingFang SC", sans-serif',
} as const;

// The memo gets one line beside the illustration, measured in full-width characters.
const LINE_UNITS = 16;

export interface OgImageOptions {
  /** The memo's opening line; it is cut to fit, never wrapped. */
  line: string;
  /** A quiet line underneath, such as the date and a tag. */
  meta: string;
}

let wasmReady: Promise<void> | null = null;

export function stripMarkdown(md: string): string {
  return md
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`[^`]+`/g, "")
    .replace(/#[\p{L}\p{N}_-]+/gu, "")
    .replace(/[#*_~[\]()>"<]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function renderOgImage(options: OgImageOptions): string {
  let line = "";
  let units = 0;
  for (const ch of options.line) {
    const unit = isWideChar(ch) ? 1 : 0.55;
    if (units + unit > LINE_UNITS) {
      line = `${line.trimEnd()}…`;
      break;
    }
    line += ch;
    units += unit;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${OG_WIDTH}" height="${OG_HEIGHT}" viewBox="0 0 ${OG_WIDTH} ${OG_HEIGHT}">
    <image href="${getBaseDataUri()}" width="${OG_WIDTH}" height="${OG_HEIGHT}" />
    <text x="76" y="392" font-family="${escapeXml(fontFamily.kai)}" font-size="31" fill="${palette.ink}">${escapeXml(line)}</text>
    <text x="76" y="442" font-family="${escapeXml(fontFamily.sans)}" font-size="21" fill="${palette.fog}">${escapeXml(options.meta)}</text>
  </svg>`;
}

export async function renderOgPng(svg: string, kv: MemoCache): Promise<ArrayBuffer> {
  await ensureWasm();

  const fontBuffers = await loadOgFonts(extractText(svg), kv);

  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: OG_WIDTH },
    font: {
      fontBuffers,
      defaultFontFamily: OG_FONT_FAMILIES.sans,
      sansSerifFamily: OG_FONT_FAMILIES.sans,
    },
  });

  const image = resvg.render();
  try {
    const png = image.asPng();
    return new Uint8Array(png).buffer;
  } finally {
    image.free();
    resvg.free();
  }
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function extractText(svg: string): string {
  let text = "";
  for (const match of svg.matchAll(/<text[^>]*>([\s\S]*?)<\/text>/g)) {
    text += match[1];
  }
  return text;
}

function isWideChar(ch: string): boolean {
  const code = ch.codePointAt(0) ?? 0;
  return (
    (code >= 0x1100 && code <= 0x115f) ||
    (code >= 0x2e80 && code <= 0xa4cf) ||
    (code >= 0xac00 && code <= 0xd7a3) ||
    (code >= 0xf900 && code <= 0xfaff) ||
    (code >= 0xfe30 && code <= 0xfe4f) ||
    (code >= 0xff00 && code <= 0xff60) ||
    (code >= 0xffe0 && code <= 0xffe6) ||
    code >= 0x1f000
  );
}

/**
 * Resolve the wasm bytes path without the bundler seeing a module request
 * (Turbopack would try to bundle ".wasm" and fail on the workerd-only "wbg"
 * virtual module). The specifier is assembled at runtime; fallback is the
 * pnpm root symlink (dev and `next start` both run from the project root).
 */
function resolveWasmPath(): string {
  const parts = ["@resvg/resvg-wasm", "index_bg.wasm"];
  try {
    return createRequire(import.meta.url).resolve(parts.join("/"));
  } catch {
    return path.join(process.cwd(), "node_modules", ...parts);
  }
}

async function ensureWasm() {
  wasmReady ??= (async () => {
    await initWasm(await fs.promises.readFile(/* turbopackIgnore: true */ resolveWasmPath()));
  })().catch((err) => {
    wasmReady = null;
    throw err;
  });
  await wasmReady;
}
