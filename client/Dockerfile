# syntax=docker/dockerfile:1

# Multi-stage. `dev` runs the Vite dev server; `prod` serves the static build
# from nginx, which also reverse-proxies /api to the server container.

FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ---------------------------------------------------------------- dev
FROM deps AS dev
ENV NODE_ENV=development
COPY . .
EXPOSE 5173
CMD ["npm", "run", "dev"]

# ---------------------------------------------------------------- build
FROM deps AS build

# Baked in at BUILD time — Vite inlines import.meta.env into the bundle, so this
# cannot be changed by setting an env var on the running container.
#
# Defaults to a relative path because in the prod stack nginx proxies /api to the
# server. That keeps the browser on one origin and sidesteps CORS entirely.
ARG VITE_API_BASE_URL=/api/metricool
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

COPY . .
RUN npm run build

# ---------------------------------------------------------------- prod
FROM nginx:1.27-alpine AS prod
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
