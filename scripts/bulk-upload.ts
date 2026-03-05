/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║         Скрипт массовой загрузки изображений для товаров FreshLife          ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 *
 * ── Быстрый старт ─────────────────────────────────────────────────────────────
 *
 *   Шаг 1. Посмотрите, какие товары есть в БД и каких изображений не хватает:
 *            npm run bulk-upload -- --list
 *
 *   Шаг 2. Поместите изображения в папку  scripts/images/
 *            Имя файла должно совпадать с названием товара в БД, например:
 *              scripts/images/Яблоки Голден.jpg
 *              scripts/images/Молоко 3.2%.png
 *
 *            Также можно именовать файлы по ID товара:
 *              scripts/images/clxyz1234abcdef.jpg
 *
 *   Шаг 3. Запустите загрузку:
 *            npm run bulk-upload
 *
 *   Шаг 4. Готово! Изображения скопированы в public/uploads/,
 *            поле imageUrl каждого товара обновлено в базе данных.
 *
 * ── Все доступные флаги ────────────────────────────────────────────────────────
 *
 *   npm run bulk-upload                          — загрузить только товары без изображений
 *   npm run bulk-upload -- --force               — перезаписать ВСЕ изображения
 *   npm run bulk-upload -- --list                — показать список товаров и статус их изображений
 *   npm run bulk-upload -- --dry-run             — симуляция без изменений в БД и файловой системе
 *   npm run bulk-upload -- --category "Фрукты"  — загрузить только для указанной категории
 *   npm run bulk-upload -- --help                — показать эту справку
 *
 * ── Логика сопоставления файлов с товарами ────────────────────────────────────
 *
 *   Для каждого файла в scripts/images/ скрипт ищет товар:
 *     1. По точному совпадению имени файла (без расширения) с product.name
 *     2. По нормализованному имени (trim + lowercase)
 *     3. По product.id
 *
 *   Файлы без совпадения пропускаются с предупреждением.
 *   Товары с уже существующим изображением пропускаются (используй --force для перезаписи).
 *
 * ── Допустимые форматы изображений ────────────────────────────────────────────
 *
 *   .jpg / .jpeg / .png / .webp / .gif
 *   Рекомендуемый размер файла: до 5 МБ (предупреждение при превышении).
 */

import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';

// Создаём собственный экземпляр Prisma для скрипта.
// Не используем синглтон из lib/prisma.ts — тот оптимизирован для HMR Next.js,
// а здесь нужен обычный клиент для одноразового запуска.
const prisma = new PrismaClient();

// ─────────────────────────────────────────────────────────────────────────────
// Константы
// ─────────────────────────────────────────────────────────────────────────────

/** Разрешённые расширения файлов-изображений */
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];

/** Порог размера файла для предупреждения (5 МБ в байтах) */
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

// ─────────────────────────────────────────────────────────────────────────────
// Вспомогательные функции
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Нормализует строку для регистронезависимого сравнения:
 * убирает пробелы по краям и приводит все символы к нижнему регистру.
 *
 * Пример: "  Яблоки Голден  " → "яблоки голден"
 */
function normalize(str: string): string {
    return str.trim().toLowerCase();
}

/**
 * Возвращает имя файла без расширения.
 * Пример: "Яблоки Голден.jpg" → "Яблоки Голден"
 */
function nameWithoutExt(filename: string): string {
    return path.basename(filename, path.extname(filename));
}

/**
 * Генерирует уникальное имя для файла в public/uploads/.
 * Формат: <unix-timestamp>_<safe-name>.<ext>
 *
 * Логика намеренно совпадает с /api/upload/route.ts, чтобы файлы,
 * загруженные скриптом, были неотличимы от загруженных через UI.
 *
 * Пример: "Молоко 3.2%.png" → "1712345678901_Молоко_3_2_.png"
 */
function generateUploadName(originalName: string): string {
    const ext = path.extname(originalName).toLowerCase();
    const safeName = path
        .basename(originalName, ext)
        // Заменяем всё, кроме латиницы, цифр, дефиса и подчёркивания, на "_"
        .replace(/[^a-zA-Z0-9_-]/g, '_')
        // Схлопываем несколько подряд идущих "_" в одно
        .replace(/_+/g, '_')
        // Ограничиваем длину имени, чтобы не получить слишком длинный путь
        .slice(0, 50);

    return `${Date.now()}_${safeName || 'image'}${ext || '.jpg'}`;
}

/**
 * Проверяет, является ли файл изображением поддерживаемого формата.
 * Проверка выполняется по расширению файла.
 */
function isImageFile(filename: string): boolean {
    return ALLOWED_EXTENSIONS.includes(path.extname(filename).toLowerCase());
}

/**
 * Форматирует размер файла в байтах в удобочитаемую строку.
 * Пример: 1536000 → "1.46 МБ"
 */
function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} Б`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} МБ`;
}

/**
 * Выводит в консоль справку по всем доступным командам.
 */
function printHelp(): void {
    console.log(`
╔══════════════════════════════════════════════════════════════════╗
║          bulk-upload — справка по использованию                  ║
╚══════════════════════════════════════════════════════════════════╝

ИСПОЛЬЗОВАНИЕ:
  npm run bulk-upload [-- ФЛАГИ]

ФЛАГИ:
  (без флагов)              Загрузить изображения для товаров, у которых
                            ещё нет картинки.

  --force                   Перезаписать изображения для ВСЕХ товаров,
                            даже если они уже есть.

  --list                    Показать список всех товаров с указанием,
                            есть ли у них изображение.

  --dry-run                 Симуляция: показать что будет сделано, но
                            НЕ копировать файлы и НЕ обновлять БД.

  --category <название>     Обрабатывать только товары из указанной
                            категории (поиск по вхождению строки).

  --help                    Показать эту справку.

ПРИМЕРЫ:
  npm run bulk-upload
      → загрузить все новые изображения из scripts/images/

  npm run bulk-upload -- --force
      → перезаписать все изображения

  npm run bulk-upload -- --dry-run
      → проверить без изменений

  npm run bulk-upload -- --category "Молочные"
      → загрузить только для молочных товаров

  npm run bulk-upload -- --list
      → посмотреть статус всех товаров

ПАПКА С ИЗОБРАЖЕНИЯМИ:
  Поместите файлы в:  scripts/images/
  Имя файла = название товара (или его ID), например:
    scripts/images/Яблоки Голден.jpg
    scripts/images/Молоко 3.2%.png
`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Основная логика
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
    // ── Разбираем аргументы командной строки ──────────────────────────────────
    const args = process.argv.slice(2);

    const isHelp    = args.includes('--help');    // показать справку
    const isForce   = args.includes('--force');   // перезаписать существующие изображения
    const isList    = args.includes('--list');    // только показать список товаров
    const isDryRun  = args.includes('--dry-run'); // симуляция без записи в БД

    // Значение флага --category: следующий элемент после самого флага
    const categoryIdx = args.indexOf('--category');
    const categoryFilter = categoryIdx !== -1 ? args[categoryIdx + 1] : null;

    // ── Режим --help: просто выводим справку и выходим ────────────────────────
    if (isHelp) {
        printHelp();
        process.exit(0);
    }

    console.log('\n═══════════════════════════════════════════════════');
    console.log('  📦 FreshLife — массовая загрузка изображений');
    console.log('═══════════════════════════════════════════════════\n');

    if (isDryRun) {
        console.log('ℹ️  Режим --dry-run: изменения НЕ будут сохранены.\n');
    }
    if (categoryFilter) {
        console.log(`🔖 Фильтр по категории: "${categoryFilter}"\n`);
    }

    // ── Загружаем все товары из БД (вместе с названием категории) ─────────────
    const allProducts = await prisma.product.findMany({
        orderBy: { name: 'asc' },
        select: {
            id: true,
            name: true,
            imageUrl: true,
            // Подтягиваем категорию, чтобы поддерживать фильтр --category
            category: { select: { name: true } },
        },
    });

    if (allProducts.length === 0) {
        console.log(
            '⚠️  В базе данных нет товаров. Сначала запустите: npm run db:seed',
        );
        await prisma.$disconnect();
        return;
    }

    // Применяем фильтр по категории, если передан флаг --category
    const products = categoryFilter
        ? allProducts.filter((p) =>
              normalize(p.category.name).includes(normalize(categoryFilter)),
          )
        : allProducts;

    if (products.length === 0) {
        console.log(
            `⚠️  Не найдено товаров в категории "${categoryFilter}".`,
        );
        console.log('   Доступные категории:');
        // Выводим уникальные названия категорий
        const uniqueCategories = [
            ...new Set(allProducts.map((p) => p.category.name)),
        ];
        uniqueCategories.forEach((c) => console.log(`   • ${c}`));
        await prisma.$disconnect();
        return;
    }

    // ── Режим --list: показываем статус изображений для всех товаров ──────────
    if (isList) {
        const withImage    = products.filter((p) => p.imageUrl);
        const withoutImage = products.filter((p) => !p.imageUrl);

        console.log(`✅ Товары С изображением (${withImage.length}):`);
        withImage.forEach((p) =>
            console.log(`   • [${p.category.name}] ${p.name}`),
        );

        console.log(`\n❌ Товары БЕЗ изображения (${withoutImage.length}):`);
        withoutImage.forEach((p) => {
            // Подсказываем пользователю, как назвать файл для этого товара
            const suggestedName = `${p.name}.jpg`;
            console.log(
                `   • [${p.category.name}] ${p.name}  →  scripts/images/${suggestedName}`,
            );
        });

        console.log(
            '\n💡 Поместите файлы в scripts/images/ и запустите:',
        );
        console.log('   npm run bulk-upload\n');
        await prisma.$disconnect();
        return;
    }

    // ── Сканируем папку scripts/images/ ───────────────────────────────────────
    // __dirname здесь указывает на папку scripts/, рядом с bulk-upload.ts
    const imagesDir = path.join(__dirname, 'images');

    if (!fs.existsSync(imagesDir)) {
        console.log('📂 Папка scripts/images/ не найдена — создаём её...');
        fs.mkdirSync(imagesDir, { recursive: true });
        console.log('✅ Папка scripts/images/ создана.\n');
        console.log(
            '💡 Теперь поместите изображения в scripts/images/ и запустите скрипт снова.',
        );
        console.log(
            "   Имя файла = название товара, например: 'Яблоки Голден.jpg'\n",
        );
        await prisma.$disconnect();
        return;
    }

    // Читаем директорию, оставляем только файлы допустимых форматов
    const imageFiles = fs
        .readdirSync(imagesDir)
        .filter(
            (f) =>
                isImageFile(f) &&
                fs.statSync(path.join(imagesDir, f)).isFile(),
        );

    if (imageFiles.length === 0) {
        console.log('⚠️  В папке scripts/images/ нет изображений.');
        console.log(
            '\n💡 Добавьте файлы с именами, совпадающими с названиями товаров:',
        );
        // Показываем первые 5 товаров как пример
        products.slice(0, 5).forEach((p) => {
            console.log(`   scripts/images/${p.name}.jpg`);
        });
        if (products.length > 5) {
            console.log(`   ... и ещё ${products.length - 5} товаров`);
        }
        console.log('\n   Полный список: npm run bulk-upload -- --list\n');
        await prisma.$disconnect();
        return;
    }

    console.log(`🔍 Найдено файлов в scripts/images/: ${imageFiles.length}`);
    console.log(`📋 Товаров в БД${categoryFilter ? ` (категория "${categoryFilter}")` : ''}: ${products.length}\n`);

    // ── Подготовка папки public/uploads/ ──────────────────────────────────────
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
        console.log('📂 Создана папка public/uploads/\n');
    }

    // ── Строим индексы товаров для быстрого поиска ────────────────────────────
    // Map по нормализованному названию позволяет находить товар без учёта регистра/пробелов
    const productByName = new Map(products.map((p) => [normalize(p.name), p]));
    // Map по ID нужен для случая, когда файл назван по ID товара
    const productById   = new Map(products.map((p) => [p.id, p]));

    // ── Обработка файлов ───────────────────────────────────────────────────────
    let matched  = 0; // успешно загружено
    let skipped  = 0; // пропущено (изображение уже есть)
    let notFound = 0; // файл не сопоставлен ни с одним товаром
    let errors   = 0; // ошибки при копировании / записи в БД
    let warnings = 0; // некритичные предупреждения (например, большой файл)

    const total = imageFiles.length;

    for (let i = 0; i < imageFiles.length; i++) {
        const filename = imageFiles[i];

        // Прогресс: [текущий/всего] чтобы было видно, сколько осталось
        const progress = `[${i + 1}/${total}]`;

        const baseName   = nameWithoutExt(filename);
        const sourcePath = path.join(imagesDir, filename);

        // ── Предупреждение о большом файле ──────────────────────────────────
        // Большие изображения замедляют сайт; рекомендуем оптимизировать заранее
        const fileStat = fs.statSync(sourcePath);
        if (fileStat.size > MAX_FILE_SIZE_BYTES) {
            console.log(
                `⚠️  ${progress} Файл "${filename}" весит ${formatFileSize(fileStat.size)} — рекомендуется сжать (оптимально < 5 МБ)`,
            );
            warnings++;
        }

        // ── Поиск товара по имени файла ──────────────────────────────────────
        // Приоритет: точное совпадение → без учёта регистра → по ID
        const product =
            productByName.get(baseName) ||           // "Молоко 3.2%" == "Молоко 3.2%"
            productByName.get(normalize(baseName)) || // "молоко 3.2%" == "молоко 3.2%"
            productById.get(baseName);                // "clxyz1234" == product.id

        if (!product) {
            console.log(
                `⚠️  ${progress} Не найден товар для файла: "${filename}"`,
            );
            notFound++;
            continue;
        }

        // ── Пропуск, если изображение уже есть (и не задан --force) ──────────
        if (product.imageUrl && !isForce) {
            console.log(
                `⏭️  ${progress} Пропускаем "${product.name}" — изображение уже есть`,
            );
            skipped++;
            continue;
        }

        // ── Копирование файла и обновление БД ────────────────────────────────
        try {
            // Уникальное имя исключает конфликты при повторных загрузках
            const uploadFilename = generateUploadName(filename);
            const destPath       = path.join(uploadsDir, uploadFilename);

            if (!isDryRun) {
                // Физически копируем файл в public/uploads/
                fs.copyFileSync(sourcePath, destPath);

                // Сохраняем URL изображения в базе данных
                await prisma.product.update({
                    where: { id: product.id },
                    data:  { imageUrl: `/uploads/${uploadFilename}` },
                });
            }

            const dryRunLabel = isDryRun ? ' [dry-run]' : '';
            console.log(
                `✅ ${progress}${dryRunLabel} "${product.name}" → /uploads/${uploadFilename}`,
            );
            matched++;
        } catch (err) {
            console.error(
                `❌ ${progress} Ошибка при обработке "${filename}":`,
                err,
            );
            errors++;
        }
    }

    // ── Итоговая статистика ────────────────────────────────────────────────────
    console.log('\n───────────────────────────────────────────────────');
    console.log('📊 Итог:');
    console.log(`   ✅ Загружено:   ${matched}`);
    console.log(`   ⏭️  Пропущено:  ${skipped} (изображение уже есть)`);
    console.log(`   ⚠️  Не найдено: ${notFound} (нет совпадения с товаром в БД)`);
    if (warnings > 0) console.log(`   ⚠️  Больших файлов: ${warnings} (рекомендуется сжать)`);
    if (errors   > 0) console.log(`   ❌ Ошибок:      ${errors}`);
    if (isDryRun)      console.log('\n   ℹ️  Режим --dry-run: изменения НЕ сохранены');
    console.log('───────────────────────────────────────────────────');

    // ── Показываем товары, у которых по-прежнему нет изображения ─────────────
    // Повторно запрашиваем БД, чтобы получить актуальное состояние после загрузки
    if (!isDryRun && matched > 0) {
        const stillWithout = await prisma.product.findMany({
            where: { imageUrl: null },
            orderBy: { name: 'asc' },
            select: { name: true, category: { select: { name: true } } },
        });

        if (stillWithout.length > 0) {
            console.log(
                `\n⚠️  Товаров по-прежнему без изображения: ${stillWithout.length}`,
            );
            stillWithout.forEach((p) =>
                console.log(`   • [${p.category.name}] ${p.name}`),
            );
            console.log('\n   Добавьте файлы и запустите скрипт снова.');
        } else {
            console.log('\n🎉 Все товары теперь имеют изображения!');
        }
    }

    if (notFound > 0) {
        console.log(
            '\n💡 Для файлов без совпадения проверьте имена через:',
        );
        console.log('   npm run bulk-upload -- --list\n');
    } else {
        console.log('');
    }

    await prisma.$disconnect();
}

// Запускаем main() и перехватываем критические ошибки на верхнем уровне.
// При критической ошибке отключаемся от БД и завершаем процесс с кодом 1.
main().catch((err) => {
    console.error('\n❌ Критическая ошибка:', err);
    prisma.$disconnect().finally(() => process.exit(1));
});
