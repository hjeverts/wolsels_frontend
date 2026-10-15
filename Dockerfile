FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npx ng build --configuration production

# Draait als niet-root gebruiker (nginx) op poort 8080.
FROM nginxinc/nginx-unprivileged:1.30-alpine
# Beveiligingsupdates van Alpine meenemen; curl is niet nodig (de healthcheck gebruikt busybox-wget).
USER root
RUN apk upgrade --no-cache && apk del --no-cache curl
USER nginx
ENV API_UPSTREAM=http://backend:8080 \
    NGINX_RESOLVER=127.0.0.11
COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist/wolsels-frontend/browser /usr/share/nginx/html
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:8080/ || exit 1
