/**
 * Skeleton-загрузчик для страницы каталога.
 *
 * Next.js App Router автоматически показывает этот компонент во время
 * перехода на страницу "/" — пока грузится JS-бандл страницы.
 * Пользователь видит мгновенный отклик вместо зависания предыдущей страницы.
 */
export default function CatalogLoading() {
  return (
    <div className="animate-pulse">
      {/* Заголовок */}
      <div
        className="h-9 w-56 rounded-xl mb-8"
        style={{ background: "var(--color-grey-200)" }}
      />

      {/* Панель фильтров */}
      <div
        className="h-14 rounded-2xl mb-6"
        style={{ background: "var(--color-grey-100)" }}
      />

      {/* Сетка карточек */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
        {Array.from({ length: 15 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl p-5"
            style={{
              background: "var(--card-bg)",
              border: "1px solid var(--card-border)",
            }}
          >
            {/* Изображение */}
            <div
              className="aspect-square rounded-xl mb-4"
              style={{ background: "var(--color-grey-200)" }}
            />
            {/* Название */}
            <div
              className="h-4 rounded-lg mb-2"
              style={{ background: "var(--color-grey-200)" }}
            />
            <div
              className="h-4 w-3/4 rounded-lg mb-3"
              style={{ background: "var(--color-grey-200)" }}
            />
            {/* Цена и остаток */}
            <div className="flex justify-between pt-1">
              <div
                className="h-5 w-20 rounded-lg"
                style={{ background: "var(--color-grey-200)" }}
              />
              <div
                className="h-5 w-16 rounded-lg"
                style={{ background: "var(--color-grey-200)" }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
