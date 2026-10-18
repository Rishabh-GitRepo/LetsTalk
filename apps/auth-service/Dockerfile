FROM node:22-alpine

WORKDIR /app

RUN npm install -g pnpm@10.15.0

COPY package.json pnpm-lock.yaml ./
COPY pnpm-workspace.yaml ./
COPY packages ./packages
COPY apps/auth-service ./apps/auth-service

WORKDIR /app/apps/auth-service
RUN pnpm install --frozen-lockfile
RUN pnpm build

CMD ["node", "dist/server.js"]
