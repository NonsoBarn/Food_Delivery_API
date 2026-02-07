FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package.json yarn.lock ./

# Install dependencies with Yarn
RUN yarn install --frozen-lockfile

# Verify nest CLI is installed
RUN npx nest --version

# Copy source code and config
COPY . .

# Create logs directory
RUN mkdir -p /app/logs

# Expose port 3000
EXPOSE 3000

# Run with hot-reload using Yarn
CMD ["yarn", "start:dev"]