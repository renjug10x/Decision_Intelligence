# Stage 1: Dependencies and Build
FROM node:20-alpine AS builder
WORKDIR /app

ARG AUTH_API_URL=
ENV AUTH_API_URL=$AUTH_API_URL

# Install dependencies first for layer caching
COPY package*.json ./
RUN npm ci

# Copy source code and data
COPY . .

# Disable Next.js telemetry during build
ENV NEXT_TELEMETRY_DISABLED=1

# Build the application
RUN npm run build

# Stage 2: Production Runner
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000

# Copy necessary production files
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/data ./data
COPY --from=builder /app/next.config.ts ./next.config.ts

EXPOSE 3000

# Next.js app starts in production mode
CMD ["npm", "run", "start"]
