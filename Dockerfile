FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json ./
RUN npm install --legacy-peer-deps

COPY index.html presentacion_inversionista_rodo.html tsconfig.json vite.config.ts ./
COPY public ./public/
COPY src ./src/

RUN npm run build

FROM nginx:1.27-alpine AS runner

RUN apk add --no-cache wget

COPY nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
