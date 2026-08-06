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
//  • If BLOB_READ_WRITE_TOKEN is set (Vercel → Storage → Blob), files go to
//    Vercel Blob and get a permanent public CDN URL. This is what you want
//    in production — serverless filesystems are wiped on every deploy.
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
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      // Lazy import (and marked external in next.config.js) so the app
      // still builds/runs before `npm install` has pulled the package.
      const { put } = await import("@vercel/blob");
      const blob = await put(`uploads/${filename}`, file, {
        access: "public",
        contentType: file.type,
      });
      return NextResponse.json({ url: blob.url });
    } catch (e: any) {
      console.error("[upload] Vercel Blob failed", e);
      const missingPkg = e?.code === "MODULE_NOT_FOUND" || /Cannot find module/i.test(String(e?.message));
      return NextResponse.json(
        {
          error: "blob_failed",
          message: missingPkg
            ? "پکیج @vercel/blob نصب نیست — یک‌بار «npm install» را در پوشه پروژه اجرا کنید."
            : `آپلود به Vercel Blob ناموفق بود: ${e?.message ?? "خطای ناشناخته"} — توکن BLOB_READ_WRITE_TOKEN را بررسی کنید.`,
        },
        { status: 500 }
      );
    }
  }

  // ── No token + running on Vercel: filesystem is read-only, so writing
  // to public/uploads is impossible. Tell the user exactly what to do
  // instead of a generic failure.
  if (process.env.VERCEL) {
    return NextResponse.json(
      {
        error: "blob_token_missing",
        message:
          "روی Vercel بدون Blob Storage نمی‌توان فایل ذخیره کرد. در پنل Vercel → Storage → Blob یک استور بسازید (متغیر BLOB_READ_WRITE_TOKEN خودکار اضافه می‌شود) و دوباره دیپلوی کنید. فعلاً می‌توانید لینک مستقیم تصویر را بچسبانید.",
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
