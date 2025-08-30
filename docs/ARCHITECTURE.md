# Architecture Documentation

## Overview

The Image Description Generator is a full-stack application that provides professional image description generation with real-time previews, comprehensive editing tools, and a production-ready backend for asset management and exports.

## Frontend Architecture

### Enhanced Guides System

The frontend now includes a sophisticated guides and snapping system:

- **GuidesOverlay Module**: Handles all visual aids including rulers, grid, and smart guides
- **Snapping System**: Provides pixel-perfect alignment with configurable thresholds
- **Keyboard Nudging**: Arrow keys for 1px, Shift+Arrow for 10px, Alt+Arrow for 0.5px movement
- **Rulers**: Top and left rulers with pixel measurements and mouse position tracking
- **Grid**: Configurable grid overlay with spacing (10-100px) and opacity (10-100%)
- **View Menu**: Organized 視圖 menu for all visual aid controls

### Key Features

1. **Performance Optimized**: Uses requestAnimationFrame for smooth interactions
2. **Accessibility**: All overlays use pointer-events: none
3. **Export Clean**: Visual aids never appear in exported images
4. **Persistence**: All user preferences saved in localStorage
5. **Responsive**: Works across different screen sizes

## Backend Architecture

### Technology Stack

- **Framework**: NestJS (Node.js)
- **Database**: PostgreSQL with Prisma ORM
- **Cache & Jobs**: Redis + BullMQ
- **Storage**: AWS S3 or Cloudflare R2
- **Authentication**: GitHub OAuth + JWT
- **Rendering**: skia-canvas (primary) + sharp (fallback)
- **Documentation**: Swagger/OpenAPI
- **Logging**: Pino with structured logging
- **Monitoring**: Health endpoints + Sentry integration

### Data Model

#### Core Entities

```
User
├── sessions[]
├── projects[]
├── exports[]
├── userPrefs
└── auditLogs[]

Project
├── layers[]
├── exports[]
├── category
└── user

Layer
├── type (TEXT|IMAGE|SHAPE|GROUP)
├── position (x, y, width, height)
├── transforms (rotation, scale, opacity)
├── styles (JSON for fonts, colors, effects)
└── content (text or image URL)

Template
├── category
├── data (JSON structure)
└── tags[]

Export
├── project
├── status (PENDING|PROCESSING|COMPLETED|FAILED)
├── format (png|jpeg|webp)
└── fileUrl
```

### API Endpoints

#### Authentication
- `GET /api/auth/session` - Get current session
- `POST /api/auth/callback/github` - GitHub OAuth callback
- `POST /api/auth/logout` - Logout

#### Assets
- `POST /api/uploads/signature` - Get signed upload URL
- `POST /api/fonts` - Upload font (admin only)

#### Templates
- `GET /api/templates` - List templates
- `POST /api/templates` - Create template
- `PUT /api/templates/:id` - Update template
- `DELETE /api/templates/:id` - Delete template

#### Projects
- `GET /api/projects` - List user projects
- `POST /api/projects` - Create project
- `PUT /api/projects/:id` - Update project
- `PUT /api/projects/:id/layers` - Batch update layers
- `DELETE /api/projects/:id` - Delete project

#### Categories
- `GET /api/categories` - List categories
- `POST /api/categories` - Create category (admin)
- `PUT /api/categories/:id` - Update category (admin)

#### Exports
- `POST /api/exports` - Create export job
- `GET /api/jobs/:id` - Get job status

#### Preferences
- `GET /api/prefs` - Get user preferences
- `PUT /api/prefs` - Update preferences

#### Health
- `GET /api/health` - Health check
- `GET /api/health/ready` - Readiness check

### Export Worker System

The export system uses BullMQ for job processing:

1. **Job Creation**: User requests export → Job queued in Redis
2. **Processing**: Worker picks up job → Renders with skia-canvas
3. **Storage**: Result uploaded to S3/R2 → Signed URL returned
4. **Notification**: Status updated → User notified

### Security Features

- **Rate Limiting**: 100 requests/15min per IP
- **CORS**: Configurable allowed origins
- **Helmet**: Security headers
- **Input Validation**: Class-validator DTOs
- **JWT**: Secure session management
- **Audit Logs**: Track all user actions

## Setup Instructions

### Development Setup

1. **Clone repository**
   ```bash
   git clone <repository-url>
   cd Image-description-generator
   ```

2. **Frontend (already working)**
   ```bash
   # Serve with any static server
   python3 -m http.server 8000
   # or
   npx serve .
   ```

3. **Backend setup**
   ```bash
   cd server
   cp .env.example .env
   # Edit .env with your configuration
   
   npm install
   npx prisma generate
   npx prisma db push
   npm run start:dev
   ```

4. **Docker setup (optional)**
   ```bash
   cd server
   docker-compose up -d
   ```

### Production Deployment

1. **Environment Variables**
   - Set all required variables from `.env.example`
   - Use strong JWT secrets
   - Configure proper CORS origins
   - Set up GitHub OAuth app

2. **Database**
   ```bash
   npx prisma migrate deploy
   ```

3. **Build & Deploy**
   ```bash
   npm run build
   npm run start:prod
   ```

4. **Health Checks**
   - `/api/health` - Overall system health
   - `/api/health/ready` - Database connectivity

### Configuration

#### Required Environment Variables

- `DATABASE_URL`: PostgreSQL connection string
- `REDIS_HOST`, `REDIS_PORT`: Redis configuration
- `JWT_SECRET`: Strong secret for JWT signing
- `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`: OAuth app credentials
- `STORAGE_*`: S3/R2 configuration for file storage

#### Optional Configuration

- `SENTRY_DSN`: Error tracking
- `LOG_LEVEL`: Logging verbosity
- `THROTTLE_*`: Rate limiting settings
- `CORS_ORIGINS`: Allowed origins

## Integration Points

### Frontend-Backend Integration

The frontend can work independently but gains enhanced features when backend is available:

1. **Feature Detection**: Frontend checks for backend availability
2. **Progressive Enhancement**: Core features work offline, cloud features require backend
3. **User Preferences**: Synced across devices when logged in
4. **Export Jobs**: Background processing for complex exports
5. **Asset Management**: Cloud storage for images and fonts

### Non-breaking Integration

The implementation ensures:

- Frontend works without backend
- Backend is additive, not required
- Graceful degradation when services unavailable
- Optional feature flags for backend functionality

## Monitoring & Observability

### Health Monitoring

- **Health endpoint**: Real-time service status
- **Database checks**: Connection and query performance
- **Redis checks**: Cache availability
- **Memory/CPU**: Process metrics

### Logging

- **Structured logging**: JSON format with correlation IDs
- **Request tracing**: Full request lifecycle tracking
- **Error tracking**: Sentry integration for production
- **Audit trails**: User action logging for compliance

### Metrics

- **Response times**: API endpoint performance
- **Error rates**: Service reliability tracking
- **User engagement**: Feature usage analytics
- **Resource usage**: Database and storage metrics

## Scaling Considerations

### Horizontal Scaling

- **Stateless backend**: Multiple instances behind load balancer
- **Redis cluster**: Distributed caching and job queues
- **Database read replicas**: Read scaling for queries
- **CDN**: Static asset delivery

### Performance Optimization

- **Database indexing**: Optimized queries for common operations
- **Caching layers**: Redis for frequently accessed data
- **Image optimization**: Multiple formats and sizes
- **Lazy loading**: On-demand resource loading

### Cost Optimization

- **Efficient storage**: Automatic cleanup of temporary files
- **Job batching**: Reduce processing overhead
- **Resource limits**: Prevent abuse and runaway costs
- **Monitoring**: Track usage patterns for optimization