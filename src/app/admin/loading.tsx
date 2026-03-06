/**
 * Skeleton-загрузчик для страницы управления товарами.
 *
 * Next.js App Router автоматически показывает этот компонент во время
 * перехода на страницу "/admin" — пока грузится JS-бандл страницы.
 */
export default function AdminLoading() {
  return (
    <div className="animate-pulse min-h-screen">
      {/* Шапка: заголовок + кнопка */}
      <div className="flex items-center justify-between mb-8 gap-3">
        <div
          className="h-9 w-64 rounded-xl"
          style={{ background: "var(--color-grey-200)" }}
        />
        <div
          className="h-10 w-36 rounded-xl"
          style={{ background: "var(--color-grey-200)" }}
        />
      </div>

      {/* Сетка карточек */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl p-5"
            style={{
              background: "var(--card-bg)",
              border: "1px solid var(--card-border)",
            }}
          >
            <div
              className="aspect-square rounded-xl mb-4"
              style={{ background: "var(--color-grey-200)" }}
            />
            <div
              className="h-4 rounded-lg mb-2"
              style={{ background: "var(--color-grey-200)" }}
            />
            <div
              className="h-4 w-3/4 rounded-lg mb-3"
              style={{ background: "var(--color-grey-200)" }}
            />
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
