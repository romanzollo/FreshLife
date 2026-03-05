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
 * Условие: продакшен-режим И DATABASE_URL указывает на libsql (Turso).
 * Если DATABASE_URL начинается с "file:" — это локальный SQLite, адаптер не нужен.
 * Если DATABASE_URL начинается с "libsql:" — это Turso, нужен адаптер.
 *
 * Такая проверка позволяет запускать продакшен-сборку локально с SQLite
 * (например, для тестирования `npm run build && npm start`).
 */
const isTurso =
  process.env.NODE_ENV === "production" &&
  process.env.DATABASE_URL?.startsWith("libsql:");

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
    // TURSO_AUTH_TOKEN   — токен аутентификации из дашборда Turso
    // Обе переменные задаются в настройках Vercel (Settings → Environment Variables)
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
      process.env.NODE_ENV === "development"
        ? // В дев-режиме выводим все SQL-запросы — удобно для отладки
          ["query", "error", "warn"]
        : // В продакшене с SQLite (например, npm start локально) — только ошибки
          ["error"],
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
