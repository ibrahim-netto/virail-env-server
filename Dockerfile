# build commands
FROM node:17

WORKDIR /app
COPY package*.json ./

RUN npm ci --only=production