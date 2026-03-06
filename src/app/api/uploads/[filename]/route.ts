/**
 * GET /api/uploads/[filename]
 *
 * Раздаёт загруженные изображения на Vercel.
 *
 * На Vercel файловая система read-only, поэтому загрузки сохраняются в /tmp/uploads/.
 * Next.js не может раздавать /tmp как статику — делаем это через API-маршрут.
 *
 * Важно: файлы в /tmp живут только пока работает контейнер Lambda (часы/дни).
 * При следующем деплое или перезапуске функции они удаляются.
 * Для постоянного хранения используйте Cloudinary или Uploadthing.
 */

import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";

const MIME_BY_EXT: Record<string, string> = {
  ".jpg":  "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png":  "image/png",
  ".webp": "image/webp",
  ".gif":  "image/gif",
};

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  const { filename } = await params;

  // Защита от path traversal: убираем всё, кроме имени файла
  const safeName = path.basename(filename);
  const filePath = path.join("/tmp/uploads", safeName);

  try {
    const buffer = await readFile(filePath);
    const ext = path.extname(safeName).toLowerCase();
    const contentType = MIME_BY_EXT[ext] ?? "application/octet-stream";

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return NextResponse.json({ error: "Файл не найден" }, { status: 404 });
  }
}
