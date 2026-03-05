# Деплой FreshLife на Vercel + Turso

Пошаговая инструкция по публикации проекта в интернете.

**Стек хостинга:**

- **Vercel** — хостинг Next.js-приложения (бесплатно, без ограничений по времени)
- **Turso** — облачная SQLite-совместимая база данных (бесплатно: 500k запросов/день, 9 ГБ)

**Время:** ~20–30 минут

---

## Шаг 1 — Залить проект на GitHub

Если ещё не сделал:

```bash
# В папке проекта
git add .
git commit -m "feat: add Turso support for Vercel deployment"
git push
```

Если репозитория ещё нет:

1. Зайди на [github.com](https://github.com) → кнопка **New repository**
2. Имя: `OzonFresh`, выбери **Private**
3. Нажми **Create repository**
4. Выполни команды которые покажет GitHub (git remote add origin ... && git push)

---

## Шаг 2 — Создать базу данных в Turso

### 2.1 Установить Turso CLI

```bash
# Windows (PowerShell — запусти от имени администратора)
winget install QL-Corp.Turso
```

Если `winget` недоступен — скачай установщик с [turso.tech/docs/cli/installation](https://docs.turso.tech/cli/installation).

### 2.2 Войти в аккаунт Turso

```bash
turso auth login
```

Откроется браузер — войди через GitHub (тот же аккаунт, что и для Vercel).

### 2.3 Создать базу данных

```bash
turso db create freshlife
```

Turso создаст базу и покажет её URL. Запомни имя `freshlife` — оно понадобится дальше.

### 2.4 Получить URL и токен

```bash
# Показывает URL базы (вида: libsql://ozonfresh-username.turso.io)
turso db show ozonfresh --url

# Создаёт токен аутентификации
turso db tokens create ozonfresh
```

Скопируй оба значения — они понадобятся на шаге 4.

### 2.5 Залить схему и данные в Turso

Временно добавь Turso в `.env` для выполнения команд:

```bash
# В .env замени DATABASE_URL на Turso URL:
# DATABASE_URL="libsql://ozonfresh-username.turso.io"
# TURSO_DATABASE_URL="libsql://ozonfresh-username.turso.io"
# TURSO_AUTH_TOKEN="твой-токен"
```

Затем выполни:

```bash
npx prisma db push
npm run db:seed
```

После этого верни `.env` обратно к локальному SQLite:

```
DATABASE_URL="file:./dev.db"
```

> **Важно:** Данные в Turso сохраняются навсегда (не сбрасываются при деплое).
> Если нужно сбросить — выполни `npm run db:reset` с Turso в `.env`.

---

## Шаг 3 — Задеплоить на Vercel

### 3.1 Зарегистрироваться на Vercel

Зайди на [vercel.com](https://vercel.com) → **Sign Up** → **Continue with GitHub**.

### 3.2 Импортировать репозиторий

1. На главной странице Vercel нажми **Add New → Project**
2. Найди репозиторий `OzonFresh` в списке → нажми **Import**
3. В настройках проекта:
    - **Framework Preset:** Next.js (определится автоматически)
    - **Root Directory:** оставь пустым (`.`)
    - **Build Command:** оставь по умолчанию (`next build`)
    - **Output Directory:** оставь по умолчанию

### 3.3 Добавить переменные окружения

На странице импорта (или позже в Settings → Environment Variables) добавь три переменные:

| Имя переменной       | Значение                               | Окружение  |
| -------------------- | -------------------------------------- | ---------- |
| `DATABASE_URL`       | `libsql://ozonfresh-username.turso.io` | Production |
| `TURSO_DATABASE_URL` | `libsql://ozonfresh-username.turso.io` | Production |
| `TURSO_AUTH_TOKEN`   | `твой-токен-из-шага-2.4`               | Production |

> **Почему DATABASE_URL и TURSO_DATABASE_URL одинаковые?**
> `DATABASE_URL` нужен Prisma для генерации клиента (`prisma generate`).
> `TURSO_DATABASE_URL` используется в коде `src/lib/prisma.ts` для подключения через адаптер.

### 3.4 Нажать Deploy

Нажми кнопку **Deploy**. Vercel:

1. Клонирует репозиторий
2. Запустит `npm install` (и автоматически `prisma generate` через postinstall)
3. Запустит `next build`
4. Опубликует сайт

Через 1–3 минуты получишь ссылку вида `https://ozon-fresh-xxx.vercel.app`.

---

## Шаг 4 — Проверить что всё работает

1. Открой ссылку от Vercel
2. Должен открыться каталог с товарами (данные из seed)
3. Перейди в «Управление товарами» — добавь тестовый товар
4. Убедись что товар появился в каталоге

---

## Обновление сайта после изменений

После любых изменений в коде:

```bash
git add .
git commit -m "описание изменений"
git push
```

Vercel автоматически обнаружит push и задеплоит новую версию за 1–2 минуты.

---

## Загрузка картинок на Vercel

> **Важно:** Vercel — serverless-платформа. Файлы загруженные через форму
> «Добавить товар» записываются во временную файловую систему и **удаляются**
> при следующем деплое или перезапуске функции.

Для демонстрации это не критично — картинки из `public/products/` (статические файлы)
работают нормально и всегда доступны.

Если нужна постоянная загрузка файлов — подключи Cloudinary или Uploadthing
(это отдельная задача, ~30 минут настройки).

---

## Локальная разработка после деплоя

Локально всё работает как раньше — ничего не изменилось:

```bash
npm run dev        # запуск на localhost:4000
npm run db:push    # создать/обновить локальную БД
npm run db:seed    # заполнить локальную БД тестовыми данными
npm run db:reset   # сбросить и пересоздать локальную БД
```

Локально используется SQLite (`prisma/dev.db`), на Vercel — Turso.
Переключение происходит автоматически по значению `DATABASE_URL`.

---

## Если что-то пошло не так

**Ошибка при деплое: "prisma generate failed"**
→ Проверь что `DATABASE_URL` добавлен в переменные окружения Vercel

**Сайт открывается но товаров нет**
→ Ты не выполнил `npm run db:seed` с Turso в `.env` (шаг 2.5)

**Ошибка "TURSO_AUTH_TOKEN is not defined"**
→ Проверь что переменная `TURSO_AUTH_TOKEN` добавлена в Vercel (Settings → Environment Variables)
→ После добавления переменных нужно сделать Redeploy (Deployments → три точки → Redeploy)

**Локально перестало работать после изменений**
→ Убедись что в `.env` стоит `DATABASE_URL="file:./dev.db"` (не Turso URL)
