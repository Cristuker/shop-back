FROM node:20-alpine

WORKDIR /app

# Copy package files first to leverage Docker layer caching
COPY package*.json ./
COPY ./prisma/ ./prisma/
COPY ./scripts ./scripts

RUN chmod +x ./prisma/wait-for-postgres.sh

# Install all dependencies, including devDependencies for development
RUN npm ci
RUN npm run prisma:generate

RUN apk update
RUN apk add dos2unix
RUN dos2unix ./prisma/wait-for-postgres.sh

CMD sh ./prisma/wait-for-postgres.sh npx prisma migrate deploy && npx prisma db seed --preview-feature

# Copy source code
COPY . ./app

# Expose the NestJS development port
EXPOSE 3000

# Start the app in watch mode for live development
CMD ["npm", "run", "start:dev"]
