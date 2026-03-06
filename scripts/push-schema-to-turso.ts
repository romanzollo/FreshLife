/**
 * Деплой схемы Prisma в Turso.
 *
 * Prisma CLI не умеет напрямую пушить схему в Turso через libsql://.
 * Этот скрипт обходит ограничение:
 *   1. Генерирует SQL через `prisma migrate diff` (локально, без соединения с БД)
 *   2. Применяет SQL к Turso через @libsql/client
 *
 * Использование:
 *   npm run db:push:turso
 *
 * Требования: TURSO_DATABASE_URL и TURSO_AUTH_TOKEN должны быть в .env
 */

import { createClient } from "@libsql/client";
import { execSync } from "child_process";
import * as path from "path";
import * as fs from "fs";

// Загружаем .env вручную (ts-node не подключает dotenv автоматически)
function loadEnv() {
  const envPath = path.resolve(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) return;

  const lines = fs.readFileSync(envPath, "utf-8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let value = trimmed.slice(eqIdx + 1).trim();
    // Убираем кавычки вокруг значения
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

async function main() {
  loadEnv();

  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!url || !authToken) {
    console.error(
      "Ошибка: TURSO_DATABASE_URL и TURSO_AUTH_TOKEN должны быть заданы в .env"
    );
    process.exit(1);
  }

  console.log("Генерирую SQL схемы через prisma migrate diff...");

  let sql: string;
  try {
    sql = execSync(
      "npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script",
      { encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] }
    );
  } catch (err: unknown) {
    const error = err as { stderr?: string; message?: string };
    console.error("Ошибка при генерации SQL:", error.stderr || error.message);
    process.exit(1);
  }

  if (!sql.trim()) {
    console.log("SQL пустой — нечего применять.");
    return;
  }

  console.log(`Подключаюсь к Turso: ${url}`);
  const client = createClient({ url, authToken });

  console.log("Применяю схему к Turso...");
  try {
    await client.executeMultiple(sql);
  } catch (err: unknown) {
    const error = err as { message?: string };
    // Игнорируем ошибки "table already exists" — это нормально при повторном запуске
    if (error.message?.includes("already exists")) {
      console.log(
        "Таблицы уже существуют — схема актуальна. (Если нужен сброс: turso db destroy + пересоздай БД)"
      );
    } else {
      console.error("Ошибка при применении схемы:", error.message);
      process.exit(1);
    }
  }

  console.log("Схема успешно применена к Turso!");
}

main();
