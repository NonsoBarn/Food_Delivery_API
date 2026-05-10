FROM node:20-alpine AS builder

RUN apk upgrade --no-cache

WORKDIR /app

COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

COPY . .
RUN NODE_OPTIONS="--max-old-space-size=1536" yarn build

# ---

FROM node:20-alpine AS production

RUN apk upgrade --no-cache

WORKDIR /app

COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile --production

COPY --from=builder /app/dist ./dist

RUN mkdir -p /app/logs

EXPOSE 3000

CMD ["node", "dist/src/main"]
