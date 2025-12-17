# # Stage 1: Build stage
# # We use Node 18 Alpine (lightweight Linux)
# FROM node:18-alpine AS builder

# # Set working directory inside container
# WORKDIR /app

# # Copy package files first (for better caching)
# # Docker caches layers - if package.json hasn't changed, it won't reinstall
# COPY package*.json ./

# # Install dependencies
# RUN npm ci --only=production && npm cache clean --force

# # Copy the rest of the application
# COPY . .

# # Build the application
# RUN npm run build

# # Stage 2: Production stage
# FROM node:18-alpine AS production

# WORKDIR /app

# # Copy package files
# COPY package*.json ./

# # Install only production dependencies
# RUN npm ci --only=production && npm cache clean --force

# # Copy built application from builder stage
# COPY --from=builder /app/dist ./dist

# # Expose port 3000
# EXPOSE 3000

# # Command to run the app
# CMD ["node", "dist/main"]





# Stage 1: Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files first
COPY package*.json ./
COPY nest-cli.json ./
COPY tsconfig*.json ./

# Install ALL dependencies (including dev) for building
RUN npm ci

# Copy the rest of the application
COPY . .

# Build the application
RUN npm run build

# Stage 2: Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist

# Copy necessary config files
COPY --from=builder /app/.env* ./
COPY --from=builder /app/tsconfig*.json ./

# Expose port 3000
EXPOSE 3000

# Command to run the app
CMD ["node", "dist/main"]