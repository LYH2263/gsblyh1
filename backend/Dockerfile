FROM node:20 AS deps
WORKDIR /app
COPY package.json ./
RUN corepack enable && corepack prepare pnpm@10.4.1 --activate && pnpm install --frozen-lockfile=false

FROM node:20 AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN corepack enable && corepack prepare pnpm@10.4.1 --activate && pnpm run build

FROM node:20 AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/dist ./dist
COPY package.json ./
COPY --from=deps /app/node_modules ./node_modules
RUN mkdir -p /app/data
EXPOSE 3000
CMD ["node", "dist/main.js"]
