import { PrismaClient } from "@prisma/client";

// Отдельный экземпляр PrismaClient для скрипта seed.
// Здесь нам не нужен singleton, потому что скрипт выполняется один раз и завершает процесс.
const prisma = new PrismaClient();

// Основная функция сидирования БД тестовыми данными.
async function main() {
  // 1. Полностью очищаем связанные таблицы.
  // Порядок удаления важен из‑за внешних ключей:
  // сначала удаляем дочерние записи (OrderItem), затем заказы и товары, затем категории.
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();

  // 2. Создаём фиксированный набор категорий.
  // Slug используется как стабильный идентификатор для привязки товаров.
  await prisma.category.createMany({
    data: [
      { name: "Фрукты и овощи", slug: "fruits-vegetables" },
      { name: "Молочные продукты", slug: "dairy" },
      { name: "Мясо и птица", slug: "meat-poultry" },
      { name: "Напитки", slug: "beverages" },
      { name: "Хлеб и выпечка", slug: "bakery" },
    ],
  });

  // 3. Загружаем созданные категории и строим карту slug → id,
  // чтобы далее не "угадывать" идентификаторы.
  const categories = await prisma.category.findMany();
  const catMap = Object.fromEntries(categories.map((c) => [c.slug, c.id]));

  // 4. Создаём набор тестовых товаров.
  // В реальном проекте это мог бы быть импорт из JSON/CSV, здесь — статический массив.
  await prisma.product.createMany({
    data: [
      { name: "Яблоки Голден", description: "Свежие яблоки, 1 кг", price: 129, categoryId: catMap["fruits-vegetables"], inStock: 50, unit: "кг", imageUrl: "/products/apple.jpg" },
      { name: "Бананы", description: "Спелые бананы, связка", price: 89, categoryId: catMap["fruits-vegetables"], inStock: 80, unit: "кг", imageUrl: "/products/banana.jpg" },
      { name: "Молоко 3.2%", description: "Молоко пастеризованное, 1 л", price: 95, categoryId: catMap["dairy"], inStock: 100, unit: "л", imageUrl: "/products/milk.jpg" },
      { name: "Кефир 2.5%", description: "Кефир натуральный, 1 л", price: 78, categoryId: catMap["dairy"], inStock: 60, unit: "л", imageUrl: "/products/kefir.jpg" },
      { name: "Куриная грудка", description: "Филе куриное охлаждённое, 1 кг", price: 349, categoryId: catMap["meat-poultry"], inStock: 30, unit: "кг", imageUrl: "/products/chicken.jpg" },
      { name: "Говядина тушёная", description: "Говядина для тушения, 500 г", price: 299, categoryId: catMap["meat-poultry"], inStock: 25, unit: "кг", imageUrl: "/products/beef.jpg" },
      { name: "Сок апельсиновый", description: "Сок прямого отжима, 1 л", price: 159, categoryId: catMap["beverages"], inStock: 70, unit: "л", imageUrl: "/products/juice.jpg" },
      { name: "Минеральная вода", description: "Вода газированная, 1.5 л", price: 45, categoryId: catMap["beverages"], inStock: 150, unit: "шт", imageUrl: "/products/water.jpg" },
      { name: "Хлеб белый", description: "Хлеб нарезной, 400 г", price: 55, categoryId: catMap["bakery"], inStock: 40, unit: "шт", imageUrl: "/products/bread.jpg" },
      { name: "Булочки сдобные", description: "Булочки свежие, 4 шт", price: 89, categoryId: catMap["bakery"], inStock: 35, unit: "шт", imageUrl: "/products/buns.jpg" },
      { name: "Помидоры", description: "Томаты свежие, 1 кг", price: 199, categoryId: catMap["fruits-vegetables"], inStock: 45, unit: "кг", imageUrl: "/products/tomato.jpg" },
      { name: "Огурцы", description: "Огурцы грунтовые, 1 кг", price: 149, categoryId: catMap["fruits-vegetables"], inStock: 55, unit: "кг", imageUrl: "/products/cucumber.jpg" },
      { name: "Сыр Российский", description: "Сыр твёрдый, 200 г", price: 189, categoryId: catMap["dairy"], inStock: 40, unit: "шт", imageUrl: "/products/cheese.jpg" },
      { name: "Йогурт натуральный", description: "Йогурт без добавок, 125 г", price: 49, categoryId: catMap["dairy"], inStock: 90, unit: "шт", imageUrl: "/products/yogurt.jpg" },
      { name: "Кола 2л", description: "Газированный напиток", price: 99, categoryId: catMap["beverages"], inStock: 80, unit: "шт", imageUrl: "/products/cola.jpg" },
    ],
  });

  console.log("✅ Seed выполнен успешно! Создано категорий:", categories.length, "и 15 товаров.");
}

// Запускаем сидирование и корректно завершаем процесс:
// при ошибке выводим в консоль и выходим с кодом 1,
// в блоке finally всегда закрываем соединение с БД.
main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
