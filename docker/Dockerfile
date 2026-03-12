FROM node:20-alpine

WORKDIR /app

COPY backend/package*.json ./backend/
RUN cd backend && npm install

COPY backend ./backend
COPY database ./database
COPY frontend ./frontend
COPY docker/docker-entrypoint.sh ./docker/docker-entrypoint.sh

RUN chmod +x ./docker/docker-entrypoint.sh
RUN cd backend && npx prisma generate

EXPOSE 8080

CMD ["sh", "-c", "./docker/docker-entrypoint.sh"]
