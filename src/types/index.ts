/**
 * Общие TypeScript-типы проекта.
 *
 * Этот файл — единственный источник истины для форм данных, которые
 * приходят из API и используются на фронтенде. Менять эти интерфейсы
 * нужно синхронно с Prisma-схемой (prisma/schema.prisma).
 *
 * Все поля соответствуют полям, которые возвращает Prisma при запросе
 * с include: { category: true }.
 */

/** Категория товара (например: "Фрукты и овощи", "Молочные продукты") */
export interface Category {
  id: string;
  name: string;
  /** URL-дружественный идентификатор, например "fruits-vegetables" */
  slug: string;
}

/**
 * Товар из каталога.
 *
 * Поля с | null соответствуют необязательным полям в Prisma-схеме (String?).
 * createdAt приходит как строка ISO 8601 (JSON не умеет передавать Date-объекты),
 * при необходимости конвертируйте через new Date(product.createdAt).
 */
export interface Product {
  id: string;
  name: string;
  /** Может быть null, если описание не заполнено при создании */
  description: string | null;
  price: number;
  /** URL изображения товара. null — если изображение не добавлено */
  imageUrl: string | null;
  /** Внешний ключ — id категории, к которой принадлежит товар */
  categoryId: string;
  /** Вложенный объект категории (доступен только если запрос делался с include: { category: true }) */
  category: Category;
  /** Количество единиц товара на складе */
  inStock: number;
  /** Единица измерения: "шт", "кг", "л", "уп" */
  unit: string;
  /** Дата создания в формате ISO 8601 */
  createdAt: string;
}
