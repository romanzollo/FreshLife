/**
 * Singleton-экземпляр Prisma Client.
 *
 * Проблема: в режиме разработки Next.js использует Hot Module Replacement (HMR) —
 * он перезагружает модули при каждом изменении файла. Без синглтона каждая
 * перезагрузка создаёт новый PrismaClient и новое соединение с БД.
 * SQLite (и другие БД) имеют лимит соединений, поэтому "утечка" соединений
 * может вызывать ошибки и предупреждения Prisma.
 *
 * Решение: храним экземпляр в globalThis.
 * - globalThis не очищается при HMR (в отличие от модульного кэша)
 * - В продакшене HMR отсутствует, поэтому там создаётся ровно один экземпляр
 *
 * Паттерн рекомендован в официальной документации Prisma для Next.js.
 * https://www.prisma.io/docs/guides/other/troubleshooting-orm/help-articles/nextjs-prisma-client-dev-practices
 */

import { PrismaClient } from "@prisma/client";

// Расширяем тип globalThis, чтобы TypeScript знал о нашем поле prisma.
// Используем unknown + as unknown для обхода ограничения: globalThis нельзя
// расширять через declaration merging в .ts-файлах напрямую.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  // Если экземпляр уже существует в globalThis — возвращаем его (дев-режим)
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? // В дев-режиме выводим все SQL-запросы для удобства отладки
          ["query", "error", "warn"]
        : // В продакшене только критические ошибки (производительность)
          ["error"],
  });

// Сохраняем экземпляр в globalThis только вне продакшена.
// В продакшене модуль загружается один раз и живёт всё время работы процесса.
if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
