/**
 * Singleton-экземпляр Prisma Client с поддержкой двух режимов БД.
 *
 * ── РЕЖИМЫ РАБОТЫ ────────────────────────────────────────────────────────────
 *
 *   ЛОКАЛЬНО (NODE_ENV=development или DATABASE_URL начинается с "file:"):
 *     Используется стандартный PrismaClient без адаптера.
 *     База данных — SQLite-файл prisma/dev.db на диске.
 *     Не нужен интернет, работает полностью офлайн.
 *
 *   ПРОДАКШЕН (NODE_ENV=production И DATABASE_URL начинается с "libsql:"):
 *     Используется PrismaClient с адаптером @prisma/adapter-libsql.
 *     База данных — Turso (облачный libSQL, совместимый с SQLite).
 *     DATABASE_URL и TURSO_AUTH_TOKEN берутся из переменных окружения Vercel.
 *
 * ── ПОЧЕМУ SINGLETON ─────────────────────────────────────────────────────────
 *
 *   Next.js в режиме разработки использует Hot Module Replacement (HMR) —
 *   при каждом сохранении файла модули перезагружаются. Без синглтона каждая
 *   перезагрузка создаёт новый PrismaClient и новое соединение с БД.
 *   Это приводит к "утечке" соединений и предупреждениям Prisma.
 *
 *   Решение: храним экземпляр в globalThis, который не очищается при HMR.
 *   В продакшене HMR отсутствует — там создаётся ровно один экземпляр.
 *
 * Документация: https://www.prisma.io/docs/guides/other/troubleshooting-orm/help-articles/nextjs-prisma-client-dev-practices
 */

import { PrismaClient } from "@prisma/client";
// Статический импорт адаптера Turso и libSQL-клиента.
// @prisma/adapter-libsql@5.x совместим с Prisma Client 5.x.
// В этой версии:
//   - класс называется PrismaLibSQL (все буквы SQL заглавные)
//   - конструктор принимает готовый Client из @libsql/client (не конфиг напрямую)
import { PrismaLibSQL } from "@prisma/adapter-libsql";
import { createClient } from "@libsql/client";

// ─────────────────────────────────────────────────────────────────────────────
// Определяем режим работы
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Проверяем, нужно ли использовать Turso.
 *
 * Определяется по наличию TURSO_DATABASE_URL и TURSO_AUTH_TOKEN.
 * Если обе переменные заданы — используем Turso адаптер (облако).
 * Если не заданы — используем стандартный SQLite (файл prisma/dev.db).
 *
 * Это позволяет:
 * - Локально работать с SQLite (не задавая TURSO_* в .env)
 * - Временно переключиться на Turso для сида (`npm run db:seed` с TURSO_* в .env)
 * - В продакшене на Vercel всегда использовать Turso (TURSO_* заданы в настройках)
 */
const isTurso = Boolean(
  process.env.TURSO_DATABASE_URL && process.env.TURSO_AUTH_TOKEN
);

// ─────────────────────────────────────────────────────────────────────────────
// Функция создания клиента
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Создаёт подходящий экземпляр PrismaClient в зависимости от окружения.
 *
 * Вынесено в функцию, чтобы не выполнять импорты и логику при каждом
 * обращении к модулю — только при первом создании синглтона.
 */
function createPrismaClient(): PrismaClient {
  if (isTurso) {
    // ── Режим Turso (продакшен на Vercel) ──────────────────────────────────
    //
    // Шаг 1: создаём libSQL-клиент с реквизитами Turso.
    // TURSO_DATABASE_URL — полный URL базы вида: libsql://your-db-name.turso.io
    // TURSO_AUTH_TOKEN   — токен аутентификации из Turso (дашборд или CLI: turso db tokens create)
    // Локально: задаются в .env для сида / тестирования Turso
    // На Vercel: задаются в Settings → Environment Variables → Production
    const tursoClient = createClient({
      url: process.env.TURSO_DATABASE_URL!,
      authToken: process.env.TURSO_AUTH_TOKEN!,
    });

    // Шаг 2: оборачиваем libSQL-клиент в адаптер Prisma.
    // PrismaLibSQL реализует интерфейс DriverAdapter — именно его ожидает PrismaClient.
    const adapter = new PrismaLibSQL(tursoClient);

    return new PrismaClient({
      adapter,
      // В продакшене логируем только ошибки — меньше шума в логах Vercel
      log: ["error"],
    });
  }

  // ── Режим SQLite (локальная разработка) ──────────────────────────────────
  //
  // Стандартный PrismaClient без адаптера.
  // DATABASE_URL берётся из .env: file:./dev.db
  return new PrismaClient({
    log:
      process.env.NODE_ENV === "production"
        ? ["error"]
        : ["query", "error", "warn"],
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Singleton
// ─────────────────────────────────────────────────────────────────────────────

// Расширяем тип globalThis, чтобы TypeScript знал о нашем поле prisma.
// Используем unknown + as unknown для обхода ограничения: globalThis нельзя
// расширять через declaration merging в .ts-файлах напрямую.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

// Возвращаем существующий экземпляр (если HMR уже создал его) или создаём новый
export const prisma = globalForPrisma.prisma ?? createPrismaClient();

// Сохраняем экземпляр в globalThis только вне продакшена.
// В продакшене модуль загружается один раз и живёт всё время работы процесса.
if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
