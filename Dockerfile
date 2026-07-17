FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY client/package.json client/
COPY server/package.json server/
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY package.json package-lock.json ./
COPY server/package.json server/
RUN npm ci --omit=dev --workspace=server
# Keep the server/dist + client/dist layout: app.ts resolves the SPA at ../../client/dist
COPY --from=build /app/server/dist server/dist
# Private assets (Callie photos) served through the auth gate, not client/dist
COPY --from=build /app/server/assets server/assets
COPY --from=build /app/client/dist client/dist
EXPOSE 3001
CMD ["node", "--experimental-sqlite", "server/dist/index.js"]
