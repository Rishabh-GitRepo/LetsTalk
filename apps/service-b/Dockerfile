FROM node:22-alpine

WORKDIR /app

RUN npm install -g pnpm@10.15.0



COPY . .

RUN pnpm install --frozen-lockfile

WORKDIR /app/apps/service-b

EXPOSE 3002

CMD ["pnpm", "dev"]