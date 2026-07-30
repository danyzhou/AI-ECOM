FROM node:20-alpine

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

COPY package*.json ./
RUN npm install --omit=dev --no-audit --no-fund && npm cache clean --force

# 直接复制编译好的产物
COPY dist ./dist
COPY public ./public
COPY healthcheck.sh ./healthcheck.sh

RUN mkdir -p /app/data /app/logs

EXPOSE 3000

CMD ["npm", "start"]
