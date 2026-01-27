FROM oven/bun:1 AS builder

WORKDIR /app

# Принимаем DATABASE_URL как build argument
ARG DATABASE_URL
ENV DATABASE_URL=${DATABASE_URL}

# Копируем файлы зависимостей
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Копируем остальной код
COPY . .

# ВАЖНО: сгенерировать .svelte-kit (tsconfig и т.п.) перед build
RUN bun run prepare

# Собираем проект (DATABASE_URL уже установлен через ARG)
RUN bun run build

FROM oven/bun:1-slim AS runner

WORKDIR /app

# Копируем только необходимые файлы после сборки
COPY --from=builder /app/build ./build
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules

# Выставляем порт (SvelteKit по умолчанию использует 3000)
EXPOSE 3000

CMD ["bun", "run", "build/index.js"]