/**
 * Прямой сид Turso через @libsql/client (без Prisma-адаптера).
 * Используется когда Prisma-адаптер падает с ECONNRESET на Windows/Node 20.
 *
 * Использование:
 *   npm run db:seed:turso
 */

import { createClient } from "@libsql/client";
import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";

// ─── Загрузка .env ───────────────────────────────────────────────────────────
function loadEnv(): void {
  const envPath = path.resolve(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf-8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const idx = t.indexOf("=");
    if (idx === -1) continue;
    const key = t.slice(0, idx).trim();
    let val = t.slice(idx + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

function cuid(): string {
  return "c" + crypto.randomBytes(11).toString("hex");
}

interface Category {
  slug: string;
  name: string;
}

interface Product {
  name: string;
  description: string;
  price: number;
  cat: string;
  stock: number;
  unit: string;
  img: string;
}

async function main(): Promise<void> {
  loadEnv();

  const url       = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!url || !authToken) {
    console.error("Ошибка: TURSO_DATABASE_URL и TURSO_AUTH_TOKEN должны быть в .env");
    process.exit(1);
  }

  console.log("Подключение к Turso:", url);
  const db = createClient({ url, authToken });

  const cats: Category[] = [
    { slug: "fruits-vegetables", name: "Фрукты и овощи" },
    { slug: "dairy",             name: "Молочные продукты" },
    { slug: "meat-poultry",      name: "Мясо и птица" },
    { slug: "beverages",         name: "Напитки" },
    { slug: "bakery",            name: "Хлеб и выпечка" },
  ];
  const catMap: Record<string, string> = {};
  for (const c of cats) { catMap[c.slug] = cuid(); }

  const now = new Date().toISOString();
  const products: Product[] = [
    { name: "Яблоки Голден",      description: "Свежие яблоки, 1 кг",            price: 129, cat: "fruits-vegetables", stock: 50,  unit: "кг",  img: "/products/apple.jpg" },
    { name: "Бананы",             description: "Спелые бананы, связка",           price: 89,  cat: "fruits-vegetables", stock: 80,  unit: "кг",  img: "/products/banana.jpg" },
    { name: "Молоко 3.2%",        description: "Молоко пастеризованное, 1 л",     price: 95,  cat: "dairy",             stock: 100, unit: "л",   img: "/products/milk.jpg" },
    { name: "Кефир 2.5%",         description: "Кефир натуральный, 1 л",          price: 78,  cat: "dairy",             stock: 60,  unit: "л",   img: "/products/kefir.jpg" },
    { name: "Куриная грудка",     description: "Филе куриное охлаждённое, 1 кг",  price: 349, cat: "meat-poultry",      stock: 30,  unit: "кг",  img: "/products/chicken.jpg" },
    { name: "Говядина тушёная",   description: "Говядина для тушения, 500 г",     price: 299, cat: "meat-poultry",      stock: 25,  unit: "кг",  img: "/products/beef.jpg" },
    { name: "Сок апельсиновый",   description: "Сок прямого отжима, 1 л",         price: 159, cat: "beverages",         stock: 70,  unit: "л",   img: "/products/juice.jpg" },
    { name: "Минеральная вода",   description: "Вода газированная, 1.5 л",        price: 45,  cat: "beverages",         stock: 150, unit: "шт",  img: "/products/water.jpg" },
    { name: "Хлеб белый",         description: "Хлеб нарезной, 400 г",            price: 55,  cat: "bakery",            stock: 40,  unit: "шт",  img: "/products/bread.jpg" },
    { name: "Булочки сдобные",    description: "Булочки свежие, 4 шт",            price: 89,  cat: "bakery",            stock: 35,  unit: "шт",  img: "/products/buns.jpg" },
    { name: "Помидоры",           description: "Томаты свежие, 1 кг",             price: 199, cat: "fruits-vegetables", stock: 45,  unit: "кг",  img: "/products/tomato.jpg" },
    { name: "Огурцы",             description: "Огурцы грунтовые, 1 кг",          price: 149, cat: "fruits-vegetables", stock: 55,  unit: "кг",  img: "/products/cucumber.jpg" },
    { name: "Сыр Российский",     description: "Сыр твёрдый, 200 г",              price: 189, cat: "dairy",             stock: 40,  unit: "шт",  img: "/products/cheese.jpg" },
    { name: "Йогурт натуральный", description: "Йогурт без добавок, 125 г",       price: 49,  cat: "dairy",             stock: 90,  unit: "шт",  img: "/products/yogurt.jpg" },
    { name: "Кола 2л",            description: "Газированный напиток",             price: 99,  cat: "beverages",         stock: 80,  unit: "шт",  img: "/products/cola.jpg" },
    { name: "Картофель",          description: "Картофель мытый, 2 кг",            price: 79,  cat: "fruits-vegetables", stock: 120, unit: "кг",  img: "/products/potato.jpg" },
    { name: "Масло сливочное",    description: "Масло 82.5% жирности, 200 г",     price: 159, cat: "dairy",             stock: 55,  unit: "шт",  img: "/products/butter.jpg" },
    { name: "Свинина (шея)",      description: "Свиная шея охлаждённая, 1 кг",    price: 389, cat: "meat-poultry",      stock: 20,  unit: "кг",  img: "/products/pork.jpg" },
    { name: "Чай чёрный",         description: "Чай листовой, 100 г",             price: 119, cat: "beverages",         stock: 65,  unit: "шт",  img: "/products/tea.jpg" },
    { name: "Батон нарезной",     description: "Батон из пшеничной муки, 350 г",  price: 49,  cat: "bakery",            stock: 50,  unit: "шт",  img: "/products/loaf.jpg" },
  ];

  // Отправляем всё одним батч-запросом — один HTTP round-trip вместо 30+
  console.log("Отправляю данные одним батчем...");
  await db.batch([
    { sql: "DELETE FROM OrderItem", args: [] },
    { sql: "DELETE FROM 'Order'",   args: [] },
    { sql: "DELETE FROM Product",   args: [] },
    { sql: "DELETE FROM Category",  args: [] },
    ...cats.map((c) => ({
      sql:  "INSERT INTO Category (id, name, slug) VALUES (?, ?, ?)",
      args: [catMap[c.slug], c.name, c.slug] as string[],
    })),
    ...products.map((p) => ({
      sql:  "INSERT INTO Product (id, name, description, price, categoryId, inStock, unit, imageUrl, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      args: [cuid(), p.name, p.description, p.price, catMap[p.cat], p.stock, p.unit, p.img, now] as (string | number)[],
    })),
  ]);

  console.log(`Готово! Создано категорий: ${cats.length}, товаров: ${products.length}`);
}

main().catch((e: unknown) => { console.error(e); process.exit(1); });
