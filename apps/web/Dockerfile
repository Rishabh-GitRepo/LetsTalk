FROM node:22-alpine AS builder

WORKDIR /app
RUN npm install -g pnpm@10.15.0

COPY package.json pnpm-lock.yaml ./
COPY pnpm-workspace.yaml ./
COPY apps/web ./apps/web

WORKDIR /app/apps/web
RUN pnpm install --frozen-lockfile
RUN pnpm build

FROM nginx:alpine
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
