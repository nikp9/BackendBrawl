FROM node:18-alpine

WORKDIR /app

# Copy package files first for better caching
COPY package.json package-lock.json ./

# Install dependencies (production-only for smaller image)
RUN npm ci --only=production

# Copy all source files
COPY . .

# Use the PORT environment variable
EXPOSE $PORT

# Start the application
CMD ["npm", "start"]