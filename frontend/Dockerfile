FROM node:20 AS build
WORKDIR /app
ARG VITE_API_BASE_URL=http://localhost:3000/api
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
COPY package.json ./
RUN corepack enable && corepack prepare pnpm@10.4.1 --activate && pnpm install --frozen-lockfile=false
COPY . .
RUN corepack enable && corepack prepare pnpm@10.4.1 --activate && pnpm run build

FROM nginx:stable
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
