FROM node:20-alpine

WORKDIR /app

# Copy package files first to leverage Docker layer caching
COPY package*.json ./

# Install all dependencies, including devDependencies for development
RUN npm ci

# Copy source code
COPY . ./app

# Expose the NestJS development port
EXPOSE 3000

# Start the app in watch mode for live development
CMD ["npm", "run", "start:dev"]
