import { PrismaClient } from "@prisma/client";

// В режиме разработки Next.js перезапускает сервер часто (горячая перезагрузка),
// и без singleton мы бы создавали новый PrismaClient при каждом обновлении.
// Это может привести к "утечке" соединений и предупреждениям от Prisma.
//
// Поэтому храним экземпляр клиента в globalThis:
// - в продакшене создаётся один экземпляр на процесс;
// - в дев-режиме переиспользуем уже созданный.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    // Логи в деве помогают отлаживать запросы, в продакшене оставляем только ошибки.
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
