/**
 * Скрипт массовой загрузки изображений для существующих товаров.
 *
 * ── Как использовать ─────────────────────────────────────────────────────────
 *
 * Шаг 1. Узнайте названия товаров в БД:
 *         npm run bulk-upload -- --list
 *
 * Шаг 2. Поместите изображения в папку  scripts/images/
 *         Имя файла = название товара (кириллица допускается), например:
 *           scripts/images/Яблоки Голден.jpg
 *           scripts/images/Молоко 3.2%.png
 *
 *         Или используйте id товара как имя файла:
 *           scripts/images/clxyz1234abcdef.jpg
 *
 * Шаг 3. Запустите скрипт:
 *         npm run bulk-upload
 *
 * Шаг 4. Готово! Изображения скопированы в public/uploads/,
 *         а поле imageUrl каждого товара обновлено в БД.
 *
 * ── Логика сопоставления файлов с товарами ────────────────────────────────
 *
 * Для каждого файла в scripts/images/ скрипт ищет товар:
 *   1. По точному совпадению имени файла (без расширения) с product.name
 *   2. По совпадению с нормализованным именем (trim, lowercase)
 *   3. По совпадению с product.id
 *
 * Файлы без совпадения пропускаются с предупреждением.
 * Товары, у которых уже есть изображение, пропускаются (используй --force для перезаписи).
 *
 * ── Запуск ───────────────────────────────────────────────────────────────────
 *   npm run bulk-upload              — загрузить только товары без изображений
 *   npm run bulk-upload -- --force   — перезаписать ВСЕ изображения
 *   npm run bulk-upload -- --list    — показать список товаров без изображений
 *   npm run bulk-upload -- --dry-run — симуляция без изменений в БД
 */

import fs from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";

// Создаём собственный экземпляр Prisma для скрипта (не используем синглтон из lib/prisma.ts,
// так как тот оптимизирован для HMR в Next.js, а здесь нам нужен чистый клиент)
const prisma = new PrismaClient();

// ─────────────────────────────────────────────────────────────────────────────
// Вспомогательные функции
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Нормализует строку для нечёткого сравнения:
 * убирает пробелы по краям и приводит к нижнему регистру.
 */
function normalize(str: string): string {
  return str.trim().toLowerCase();
}

/**
 * Возвращает имя файла без расширения.
 * Например: "Яблоки Голден.jpg" → "Яблоки Голден"
 */
function nameWithoutExt(filename: string): string {
  return path.basename(filename, path.extname(filename));
}

/**
 * Генерирует уникальное имя для файла в public/uploads/.
 * Формат: <timestamp>_<sanitized_name>.<ext>
 * Совпадает с логикой в /api/upload/route.ts для единообразия.
 */
function generateUploadName(originalName: string): string {
  const ext = path.extname(originalName).toLowerCase();
  const safeName = path
    .basename(originalName, ext)
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 50);
  return `${Date.now()}_${safeName || "image"}${ext || ".jpg"}`;
}

/** MIME-типы изображений, которые принимаем (по расширению файла) */
const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".gif"];

/**
 * Проверяет, является ли файл изображением по расширению.
 */
function isImageFile(filename: string): boolean {
  return ALLOWED_EXTENSIONS.includes(path.extname(filename).toLowerCase());
}

// ─────────────────────────────────────────────────────────────────────────────
// Основная логика
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  // Разбираем аргументы командной строки
  const args = process.argv.slice(2);
  const isForce = args.includes("--force");    // перезаписать существующие изображения
  const isList = args.includes("--list");      // только показать список товаров
  const isDryRun = args.includes("--dry-run"); // симуляция без записи в БД

  console.log("\n═══════════════════════════════════════════════════");
  console.log("  📦 OzonFresh — массовая загрузка изображений");
  console.log("═══════════════════════════════════════════════════\n");

  // ── Загружаем все товары из БД ─────────────────────────────────────────────
  const products = await prisma.product.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, imageUrl: true },
  });

  if (products.length === 0) {
    console.log("⚠️  В базе данных нет товаров. Запустите: npm run db:seed");
    await prisma.$disconnect();
    return;
  }

  // ── Режим --list: только показываем товары без изображений ────────────────
  if (isList) {
    const withoutImage = products.filter((p) => !p.imageUrl);
    const withImage = products.filter((p) => p.imageUrl);

    console.log(`✅ Товары с изображениями (${withImage.length}):`);
    withImage.forEach((p) => console.log(`   • ${p.name}`));

    console.log(`\n❌ Товары БЕЗ изображений (${withoutImage.length}):`);
    withoutImage.forEach((p) => {
      // Показываем рекомендуемое имя файла для этого товара
      const suggestedName = `${p.name}.jpg`;
      console.log(`   • ${p.name}  →  scripts/images/${suggestedName}`);
    });

    console.log("\n💡 Поместите файлы в папку scripts/images/ и запустите:");
    console.log("   npm run bulk-upload\n");
    await prisma.$disconnect();
    return;
  }

  // ── Сканируем папку scripts/images/ ───────────────────────────────────────
  const imagesDir = path.join(__dirname, "images");

  if (!fs.existsSync(imagesDir)) {
    console.log("📂 Папка scripts/images/ не найдена — создаём её...");
    fs.mkdirSync(imagesDir, { recursive: true });
    console.log("✅ Папка создана.\n");
    console.log("💡 Теперь поместите изображения в scripts/images/ и запустите скрипт снова.");
    console.log("   Имя файла = название товара, например: 'Яблоки Голден.jpg'\n");
    await prisma.$disconnect();
    return;
  }

  // Фильтруем только файлы-изображения (пропускаем .gitkeep, .DS_Store и т.д.)
  const imageFiles = fs
    .readdirSync(imagesDir)
    .filter((f) => isImageFile(f) && fs.statSync(path.join(imagesDir, f)).isFile());

  if (imageFiles.length === 0) {
    console.log("⚠️  В папке scripts/images/ нет изображений.");
    console.log("\n💡 Добавьте файлы с именами, совпадающими с названиями товаров:");
    products.slice(0, 5).forEach((p) => {
      console.log(`   scripts/images/${p.name}.jpg`);
    });
    if (products.length > 5) {
      console.log(`   ... и ещё ${products.length - 5} товаров`);
    }
    console.log("\n   Полный список: npm run bulk-upload -- --list\n");
    await prisma.$disconnect();
    return;
  }

  console.log(`🔍 Найдено файлов в scripts/images/: ${imageFiles.length}`);
  console.log(`📋 Товаров в БД: ${products.length}\n`);

  // ── Подготовка папки public/uploads/ ──────────────────────────────────────
  const uploadsDir = path.join(process.cwd(), "public", "uploads");
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log("📂 Создана папка public/uploads/\n");
  }

  // ── Строим индекс товаров для быстрого поиска ─────────────────────────────
  // Ключ — нормализованное название, значение — объект товара
  const productByName = new Map(
    products.map((p) => [normalize(p.name), p])
  );
  // Ключ — id товара (для поиска по ID)
  const productById = new Map(products.map((p) => [p.id, p]));

  // ── Обработка каждого файла ────────────────────────────────────────────────
  let matched = 0;
  let skipped = 0;
  let notFound = 0;
  let errors = 0;

  for (const filename of imageFiles) {
    const baseName = nameWithoutExt(filename);
    const sourcePath = path.join(imagesDir, filename);

    // Ищем товар: сначала по точному имени, потом по нормализованному, потом по ID
    const product =
      productByName.get(baseName) ||           // точное совпадение (с регистром)
      productByName.get(normalize(baseName)) || // нормализованное (без учёта регистра)
      productById.get(baseName);               // совпадение по ID товара

    if (!product) {
      console.log(`⚠️  Не найден товар для файла: ${filename}`);
      notFound++;
      continue;
    }

    // Пропускаем товары с уже установленным изображением (если не --force)
    if (product.imageUrl && !isForce) {
      console.log(`⏭️  Пропускаем "${product.name}" — изображение уже есть (${product.imageUrl})`);
      skipped++;
      continue;
    }

    try {
      // Генерируем уникальное имя файла для public/uploads/
      const uploadFilename = generateUploadName(filename);
      const destPath = path.join(uploadsDir, uploadFilename);

      if (!isDryRun) {
        // Копируем файл в public/uploads/
        fs.copyFileSync(sourcePath, destPath);

        // Обновляем imageUrl товара в БД
        await prisma.product.update({
          where: { id: product.id },
          data: { imageUrl: `/uploads/${uploadFilename}` },
        });
      }

      const flag = isDryRun ? "[dry-run] " : "";
      console.log(`✅ ${flag}"${product.name}" → /uploads/${uploadFilename}`);
      matched++;
    } catch (err) {
      console.error(`❌ Ошибка при обработке "${filename}":`, err);
      errors++;
    }
  }

  // ── Итоговая статистика ────────────────────────────────────────────────────
  console.log("\n───────────────────────────────────────────────────");
  console.log(`📊 Итог:`);
  console.log(`   ✅ Загружено:  ${matched}`);
  console.log(`   ⏭️  Пропущено: ${skipped} (уже есть изображение)`);
  console.log(`   ⚠️  Не найдено: ${notFound} (нет совпадения с товаром)`);
  if (errors > 0) console.log(`   ❌ Ошибок:    ${errors}`);
  if (isDryRun) console.log("\n   ℹ️  Режим --dry-run: изменения НЕ сохранены в БД");
  console.log("───────────────────────────────────────────────────\n");

  if (notFound > 0) {
    console.log("💡 Для товаров без совпадения проверьте имена файлов:");
    console.log("   npm run bulk-upload -- --list\n");
  }

  await prisma.$disconnect();
}

// Запускаем и обрабатываем ошибки на верхнем уровне
main().catch((err) => {
  console.error("\n❌ Критическая ошибка:", err);
  prisma.$disconnect().finally(() => process.exit(1));
});
