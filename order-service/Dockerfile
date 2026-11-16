FROM node:22-alpine

WORKDIR /app

COPY order-service/package*.json ./
RUN npm install

COPY order-service/ ./order-service/

COPY shared/ ./shared/

WORKDIR /app/order-service

RUN DATABASE_URL="postgresql://postgres:build_only@localhost:5432/orderservice_db" npx prisma generate

EXPOSE 5002

CMD ["sh", "-c", "npx prisma migrate deploy && node server.js"]