import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { randomBytes } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { rateLimit, clientIp, tooMany } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";

const MAX_BYTES = 4 * 1024 * 1024; // 4MB
const ALLOWED: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

function hasValidImageSignature(type: string, bytes: Uint8Array): boolean {
  if (type === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (type === "image/png") return bytes.slice(0, 8).every((v, i) => v === [0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a][i]);
  if (type === "image/gif") return new TextDecoder().decode(bytes.slice(0, 6)) === "GIF87a" || new TextDecoder().decode(bytes.slice(0, 6)) === "GIF89a";
  if (type === "image/webp") return new TextDecoder().decode(bytes.slice(0, 4)) === "RIFF" && new TextDecoder().decode(bytes.slice(8, 12)) === "WEBP";
  return false;
}

// POST /api/upload — real image upload (multipart/form-data, field "file").
// Any signed-in identity may upload (shop staff for avatars, platform admin
// for ad banners) — the returned URL is then saved through the normal
// role-guarded endpoints, so no privilege is gained here beyond hosting.
//
// Storage backend:
//  • Vercel Blob supports either the legacy BLOB_READ_WRITE_TOKEN or the
//    current OIDC pair (VERCEL_OIDC_TOKEN + BLOB_STORE_ID). Files receive a
//    permanent public CDN URL. Serverless filesystems are wiped on deploy.
//  • Otherwise (local dev) files land in ./public/uploads and are served
//    from /uploads/... by Next itself.
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const userId = (session.user as { id?: string }).id || clientIp(req);
  const uploadLimit = await rateLimit(`upload:${userId}`, 20, 60 * 60 * 1000);
  if (!uploadLimit.ok) { const t = tooMany(uploadLimit.retryAfterSec); return NextResponse.json({ message: t.message }, { status: t.status }); }

  let file: File | null = null;
  try {
    const form = await req.formData();
    const f = form.get("file");
    if (f instanceof File) file = f;
  } catch {
    return NextResponse.json({ error: "invalid_form" }, { status: 400 });
  }
  if (!file) return NextResponse.json({ error: "no_file", message: "فایلی ارسال نشده" }, { status: 400 });

  const ext = ALLOWED[file.type];
  if (!ext) {
    return NextResponse.json({ error: "bad_type", message: "فقط تصویر (JPG, PNG, WebP, GIF) مجاز است" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "too_large", message: "حداکثر حجم مجاز ۴ مگابایت است" }, { status: 400 });
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!hasValidImageSignature(file.type, bytes)) {
    return NextResponse.json({ error: "invalid_image", message: "محتوای فایل با فرمت تصویر انتخاب‌شده مطابقت ندارد" }, { status: 400 });
  }

  const filename = `${Date.now()}-${randomBytes(6).toString("hex")}.${ext}`;

  // ── Backend 1: Vercel Blob (production) ────────────────────────────
  // New stores connected in Vercel use short-lived OIDC credentials by
  // default. Older stores still expose BLOB_READ_WRITE_TOKEN. The SDK picks
  // the right credential automatically; this guard only verifies that a
  // store is actually connected to the deployment.
  const hasLegacyBlobToken = Boolean(process.env.BLOB_READ_WRITE_TOKEN);
  const hasBlobOidc = Boolean(process.env.VERCEL_OIDC_TOKEN && process.env.BLOB_STORE_ID);
  if (hasLegacyBlobToken || hasBlobOidc) {
    try {
      const { put } = await import("@vercel/blob");
      const blob = await put(`uploads/${filename}`, file, {
        access: "public",
        contentType: file.type,
      });
      return NextResponse.json({ url: blob.url });
    } catch (e: any) {
      console.error("[upload] Vercel Blob failed", e);
      return NextResponse.json(
        {
          error: "blob_failed",
          message: "ذخیره تصویر موقتاً انجام نشد. اتصال Blob پروژه را در پنل Vercel بررسی کرده و دوباره تلاش کنید.",
        },
        { status: 502 }
      );
    }
  }

  // ── No connected store + Vercel: filesystem is ephemeral, so writing to
  // public/uploads would appear to work and then vanish on the next deploy.
  if (process.env.VERCEL) {
    return NextResponse.json(
      {
        error: "blob_store_not_connected",
        message:
          "فضای ذخیره‌سازی تصاویر هنوز به پروژه متصل نیست. مدیر سامانه باید در Vercel → Storage یک Blob عمومی بسازد، آن را به محیط Production متصل کند و دوباره Deploy بگیرد.",
      },
      { status: 503 }
    );
  }

  // ── Backend 2: local disk (development) ────────────────────────────
  try {
    const dir = path.join(process.cwd(), "public", "uploads");
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, filename), bytes);
    return NextResponse.json({
      url: `/uploads/${filename}`,
      warning:
        "فایل به‌صورت محلی ذخیره شد. برای محیط واقعی (Vercel) حتماً BLOB_READ_WRITE_TOKEN را تنظیم کنید، وگرنه فایل‌ها بعد از هر دیپلوی پاک می‌شوند.",
    });
  } catch (e: any) {
    console.error("[upload] local write failed", e);
    return NextResponse.json(
      { error: "upload_failed", message: `ذخیره فایل ناموفق بود: ${e?.message ?? "خطای ناشناخته"}` },
      { status: 500 }
    );
  }
}
