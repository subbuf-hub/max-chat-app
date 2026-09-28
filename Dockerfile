# --- Этап 1: Сборка приложения ---
FROM node:20-alpine AS builder

# Устанавливаем рабочую директорию
WORKDIR /app

# Копируем файлы зависимостей
COPY package*.json ./

# Устанавливаем зависимости (используем ci для строгой установки)
RUN npm ci

# Копируем весь исходный код
COPY . .

# Собираем проект (папка dist)
RUN npm run build

# --- Этап 2: Раздача статики через Nginx ---
FROM nginx:alpine

# Копируем собранные файлы из первого этапа
COPY --from=builder /app/dist /usr/share/nginx/html

# Копируем наш конфиг Nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Открываем порт 80
EXPOSE 80

# Запускаем Nginx
CMD ["nginx", "-g", "daemon off;"]