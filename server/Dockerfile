# syntax=docker/dockerfile:1

# Multi-stage. `dev` runs tsx watch against bind-mounted source; `prod` ships
# only compiled JS and production deps.

FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ---------------------------------------------------------------- dev
FROM deps AS dev
ENV NODE_ENV=development
# Source is bind-mounted by compose; this COPY only makes the image runnable
# standalone (e.g. `docker run` without compose).
COPY . .
EXPOSE 5000
CMD ["npm", "run", "dev"]

# ---------------------------------------------------------------- build
FROM deps AS build
COPY . .
RUN npm run build

# Production deps only — tsx/typescript/@types have no business in the runtime image.
FROM node:22-alpine AS prod-deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# ---------------------------------------------------------------- prod
FROM node:22-alpine AS prod
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=5000

COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json ./

# Don't run as root.
USER node

EXPOSE 5000

# The app logs the Metricool startup self-check on boot — check `docker compose
# logs server` for "[Metricool] OK" after any credential change.
CMD ["node", "dist/index.js"]
