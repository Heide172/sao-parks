FROM oven/bun:1 AS builder

WORKDIR /app

# Копируем файлы зависимостей
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Копируем остальной код
COPY . .

# Устанавливаем адаптер node (если еще не установлен) и собираем проект
# Важно: убедитесь, что в svelte.config.js используется @sveltejs/adapter-node
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