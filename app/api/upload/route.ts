import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { randomBytes } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

export const dynamic = "force-dynamic";

const MAX_BYTES = 4 * 1024 * 1024; // 4MB
const ALLOWED: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

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

  const filename = `${Date.now()}-${randomBytes(6).toString("hex")}.${ext}`;

  try {
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      // Vercel Blob — dynamic import so local dev without the package's
      // token (or even without the dependency installed yet) still works.
      const { put } = await import("@vercel/blob");
      const blob = await put(`uploads/${filename}`, file, {
        access: "public",
        contentType: file.type,
      });
      return NextResponse.json({ url: blob.url });
    }

    // Local-dev fallback: write into ./public/uploads.
    const dir = path.join(process.cwd(), "public", "uploads");
    await mkdir(dir, { recursive: true });
    const bytes = Buffer.from(await file.arrayBuffer());
    await writeFile(path.join(dir, filename), bytes);
    return NextResponse.json({
      url: `/uploads/${filename}`,
      warning:
        "فایل به‌صورت محلی ذخیره شد. برای محیط واقعی (Vercel) حتماً BLOB_READ_WRITE_TOKEN را تنظیم کنید، وگرنه فایل‌ها بعد از هر دیپلوی پاک می‌شوند.",
    });
  } catch (e) {
    console.error("[upload] failed", e);
    return NextResponse.json({ error: "upload_failed", message: "آپلود ناموفق بود" }, { status: 500 });
  }
}
