# --- build ---
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
# The gateway URL is baked in at build time (Vite env).
ARG EXPO_PUBLIC_API_BASE_URL=https://api.spacz.in
ENV EXPO_PUBLIC_API_BASE_URL=$EXPO_PUBLIC_API_BASE_URL
RUN npm run build

# --- serve ---
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html
# Used by nginx.conf for the CSP connect-src.
ENV API_ORIGIN=https://api.spacz.in
EXPOSE 80
