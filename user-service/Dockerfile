FROM node:22-alpine

WORKDIR /app

# Copy User Service dependencies
COPY user-service/package*.json ./
RUN npm install

# Copy User Service code
COPY user-service/ ./user-service/

# Copy shared proto file
COPY shared/ ./shared/

WORKDIR /app/user-service

EXPOSE 5001 50051

CMD ["node", "server.js"]