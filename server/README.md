# Image Description Generator - Backend

Production-ready NestJS backend for the Image Description Generator application.

## Features

- **Authentication**: GitHub OAuth with JWT sessions
- **Database**: PostgreSQL with Prisma ORM
- **Job Queues**: Redis + BullMQ for export processing
- **Storage**: AWS S3 or Cloudflare R2 integration
- **Rendering**: skia-canvas for high-quality image exports
- **Security**: Rate limiting, CORS, input validation
- **Monitoring**: Health endpoints, structured logging
- **Documentation**: Swagger/OpenAPI integration

## Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL 15+
- Redis 7+

### Development Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Setup database**
   ```bash
   npx prisma generate
   npx prisma db push
   ```

4. **Start development server**
   ```bash
   npm run start:dev
   ```

The server will start at `http://localhost:3000` with API documentation at `/api/docs`.

### Docker Setup

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## API Documentation

When running in development mode, visit:
- **API**: http://localhost:3000/api
- **Swagger Docs**: http://localhost:3000/api/docs
- **Health Check**: http://localhost:3000/api/health

## Database Management

```bash
# Generate Prisma client
npx prisma generate

# Push schema changes (development)
npx prisma db push

# Create migration (production)
npx prisma migrate dev

# Deploy migrations
npx prisma migrate deploy

# Open Prisma Studio
npx prisma studio
```

## Job Workers

Start the export worker for background processing:

```bash
npm run worker:dev
```

## Production Deployment

1. **Set environment variables**
   ```bash
   export NODE_ENV=production
   export DATABASE_URL="postgresql://..."
   export JWT_SECRET="your-secret-key"
   # ... other variables from .env.example
   ```

2. **Build application**
   ```bash
   npm run build
   ```

3. **Run migrations**
   ```bash
   npx prisma migrate deploy
   ```

4. **Start production server**
   ```bash
   npm run start:prod
   ```

## Environment Variables

See `.env.example` for all required and optional configuration options.

### Required Variables

- `DATABASE_URL`: PostgreSQL connection string
- `JWT_SECRET`: Secret for JWT token signing
- `REDIS_HOST`: Redis server host
- `GITHUB_CLIENT_ID`: GitHub OAuth app ID
- `GITHUB_CLIENT_SECRET`: GitHub OAuth app secret

### Optional Variables

- `SENTRY_DSN`: Error tracking
- `LOG_LEVEL`: Logging verbosity (debug, info, warn, error)
- `CORS_ORIGINS`: Comma-separated allowed origins
- `STORAGE_*`: Object storage configuration

## Project Structure

```
src/
├── auth/              # Authentication & authorization
├── users/             # User management & preferences
├── projects/          # Project CRUD operations
├── templates/         # Template management
├── categories/        # Category system
├── assets/            # File upload & storage
├── exports/           # Export job management
├── health/            # Health check endpoints
├── worker/            # Background job workers
└── common/            # Shared utilities
    ├── prisma/        # Database service
    ├── guards/        # Auth guards
    ├── decorators/    # Custom decorators
    ├── dto/           # Data transfer objects
    ├── pipes/         # Validation pipes
    └── filters/       # Exception filters
```

## Testing

```bash
# Unit tests
npm run test

# Watch mode
npm run test:watch

# Coverage
npm run test:cov

# E2E tests
npm run test:e2e
```

## Monitoring

### Health Endpoints

- `GET /api/health` - Overall system health
- `GET /api/health/ready` - Database readiness

### Logging

The application uses structured JSON logging with Pino. In development, logs are pretty-printed to the console.

### Metrics

Production deployments should monitor:
- Response times and error rates
- Database connection pool usage
- Redis connection status
- Memory and CPU usage
- Job queue metrics

## Security

- Rate limiting: 100 requests per 15 minutes per IP
- CORS: Configurable allowed origins
- Helmet: Security headers
- Input validation: Class-validator DTOs
- Authentication: JWT with configurable expiration
- Audit logging: All user actions tracked

## License

Private - All rights reserved