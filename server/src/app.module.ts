import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { ServeStaticModule } from '@nestjs/serve-static';
import { LoggerModule } from 'nestjs-pino';
import { join } from 'path';

// Application modules
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ProjectsModule } from './projects/projects.module';
import { TemplatesModule } from './templates/templates.module';
import { CategoriesModule } from './categories/categories.module';
import { AssetsModule } from './assets/assets.module';
import { ExportsModule } from './exports/exports.module';
import { HealthModule } from './health/health.module';
import { PrismaModule } from './common/prisma/prisma.module';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),

    // Logging
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        pinoHttp: {
          transport: config.get('NODE_ENV') !== 'production' ? {
            target: 'pino-pretty',
            options: {
              colorize: true,
              singleLine: true,
            },
          } : undefined,
          level: config.get('LOG_LEVEL', 'info'),
        },
      }),
    }),

    // Rate limiting
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        ttl: config.get('THROTTLE_TTL', 60),
        limit: config.get('THROTTLE_LIMIT', 10),
      }),
    }),

    // Serve static files (for frontend)
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', '..', '..'),
      exclude: ['/api*'],
    }),

    // Database
    PrismaModule,

    // Application modules
    AuthModule,
    UsersModule,
    ProjectsModule,
    TemplatesModule,
    CategoriesModule,
    AssetsModule,
    ExportsModule,
    HealthModule,
  ],
})
export class AppModule {}