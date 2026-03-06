/**
 * API-маршрут для загрузки изображений товаров.
 *
 * POST /api/upload
 *   Принимает multipart/form-data с полем "file" (изображение).
 *   Сохраняет файл в папку public/uploads/ с уникальным именем.
 *   Возвращает { url: "/uploads/<filename>" } — готовый URL для сохранения в БД.
 *
 * Почему public/uploads/?
 *   Next.js автоматически раздаёт все файлы из папки public/ как статику.
 *   Файл public/uploads/photo.jpg будет доступен по адресу /uploads/photo.jpg
 *   без дополнительной конфигурации — идеально для локальной сети.
 *
 * Почему не используем multer/formidable?
 *   Next.js App Router поддерживает request.formData() нативно (Web Fetch API),
 *   а для записи файла достаточно стандартного Node.js fs/promises.
 *   Дополнительные зависимости не нужны.
 */

import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

// ─────────────────────────────────────────────────────────────────────────────
// Константы валидации
// ─────────────────────────────────────────────────────────────────────────────

/**
 * MIME-типы, которые мы принимаем.
 * Ограничиваем только изображениями — нет смысла хранить PDF или видео для товаров.
 */
const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

/**
 * Максимальный размер файла в байтах — 5 МБ.
 * Для локальной сети этого более чем достаточно для фото товаров.
 */
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 МБ

// ─────────────────────────────────────────────────────────────────────────────
// Вспомогательные функции
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Генерирует безопасное уникальное имя файла.
 *
 * Формат: <timestamp>_<sanitized_original_name><ext>
 * Например: 1709123456789_yabloki_golden.jpg
 *
 * Зачем timestamp? Гарантирует уникальность даже при одновременных загрузках
 * и позволяет видеть порядок загрузки при сортировке по имени.
 */
function generateFileName(originalName: string): string {
  // Отделяем расширение от имени файла
  const ext = path.extname(originalName).toLowerCase();

  // Берём имя без расширения, оставляем только буквы/цифры/дефисы/подчёркивания,
  // остальные символы (кириллица, пробелы, спецсимволы) заменяем на "_"
  const safeName = path
    .basename(originalName, ext)
    .replace(/[^a-zA-Z0-9_-]/g, "_") // заменяем небезопасные символы
    .replace(/_+/g, "_")             // убираем двойные подчёркивания
    .slice(0, 50);                   // ограничиваем длину имени

  // Date.now() даёт миллисекунды — достаточная точность для уникальности
  return `${Date.now()}_${safeName || "image"}${ext || ".jpg"}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Обработчик маршрута
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /api/upload
 *
 * Ожидает: multipart/form-data с полем "file"
 * Content-Type НЕ указываем вручную — браузер сам добавит boundary
 *
 * Ответ 201: { url: "/uploads/<filename>" }
 * Ответ 400: { error: "<причина>" }
 * Ответ 500: { error: "Ошибка загрузки файла" }
 */
export async function POST(request: NextRequest) {
  try {
    // Парсим multipart/form-data через нативный Web API (встроен в Next.js)
    const formData = await request.formData();

    // Извлекаем поле "file" — именно это поле отправляет ProductForm
    const file = formData.get("file");

    // Проверяем, что поле существует и является файлом (не строкой)
    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "Поле 'file' не передано или не является файлом" },
        { status: 400 }
      );
    }

    // ── Валидация MIME-типа ────────────────────────────────────────────────────
    // Проверяем тип файла по заголовку Content-Type, переданному браузером.
    // Это не абсолютная защита (тип можно подделать), но достаточно для локальной сети.
    if (!ALLOWED_MIME_TYPES.includes(file.type as typeof ALLOWED_MIME_TYPES[number])) {
      return NextResponse.json(
        { error: "Недопустимый формат файла. Разрешены: JPEG, PNG, WebP, GIF" },
        { status: 400 }
      );
    }

    // ── Валидация размера файла ────────────────────────────────────────────────
    if (file.size > MAX_FILE_SIZE) {
      const sizeMb = (file.size / 1024 / 1024).toFixed(1);
      return NextResponse.json(
        { error: `Файл слишком большой (${sizeMb} МБ). Максимум — 5 МБ` },
        { status: 400 }
      );
    }

    // ── Чтение содержимого файла ───────────────────────────────────────────────
    // arrayBuffer() читает весь файл в память. Для изображений (до 5 МБ) — норма.
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // ── Подготовка пути для сохранения ────────────────────────────────────────
    const filename = generateFileName(file.name);

    // На Vercel (serverless) файловая система read-only, кроме /tmp.
    // Локально пишем в public/uploads/ (раздаётся Next.js как статика).
    // На Vercel пишем в /tmp/uploads/ и отдаём через /api/uploads/[filename].
    const isVercel = Boolean(process.env.VERCEL);
    const uploadDir = isVercel
      ? "/tmp/uploads"
      : path.join(process.cwd(), "public", "uploads");

    // Создаём директорию, если она ещё не существует.
    // { recursive: true } — не выбрасывает ошибку, если папка уже есть.
    await mkdir(uploadDir, { recursive: true });

    // ── Запись файла ───────────────────────────────────────────────────────────
    await writeFile(path.join(uploadDir, filename), buffer);

    // На Vercel файл в /tmp/ отдаётся через /api/uploads/[filename].
    // Локально файл в public/uploads/ отдаётся как статика /uploads/[filename].
    const url = isVercel ? `/api/uploads/${filename}` : `/uploads/${filename}`;

    return NextResponse.json({ url }, { status: 201 });
  } catch (error) {
    console.error("POST /api/upload:", error);
    return NextResponse.json(
      { error: "Внутренняя ошибка при загрузке файла" },
      { status: 500 }
    );
  }
}
