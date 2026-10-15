# Bouwt de Angular-app en levert alleen de statische bestanden op; die worden geserveerd door de
# nginx op de server. Exporteren naar een map (zonder Node op de server):
#   docker build --output type=local,dest=./out .
FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npx ng build --configuration production

FROM scratch AS dist
COPY --from=build /app/dist/wolsels-frontend/browser /
