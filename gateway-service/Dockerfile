# 1. Etapa de compilación
FROM node:20-alpine AS builder

WORKDIR /usr/src/app

COPY package*.json tsconfig.json ./
RUN npm install

COPY src/ ./src
RUN npm run build

# 2. Etapa de ejecución
FROM node:20-alpine

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install --only=production

COPY --from=builder /usr/src/app/dist ./dist

EXPOSE 8086

CMD ["npm", "start"]
