import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class HealthService {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async getHealthStatus() {
    const checks = await Promise.allSettled([
      this.checkDatabase(),
      this.checkRedis(),
    ]);

    const database = checks[0].status === 'fulfilled' ? checks[0].value : { status: 'down', error: (checks[0] as any).reason };
    const redis = checks[1].status === 'fulfilled' ? checks[1].value : { status: 'down', error: (checks[1] as any).reason };

    const overall = database.status === 'up' && redis.status === 'up' ? 'up' : 'down';

    return {
      status: overall,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: this.configService.get('NODE_ENV'),
      version: process.env.npm_package_version || '1.0.0',
      checks: {
        database,
        redis,
      },
    };
  }

  async getReadinessStatus() {
    try {
      await this.checkDatabase();
      return {
        status: 'ready',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        status: 'not ready',
        timestamp: new Date().toISOString(),
        error: error.message,
      };
    }
  }

  private async checkDatabase() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'up' };
    } catch (error) {
      return { status: 'down', error: error.message };
    }
  }

  private async checkRedis() {
    // This would check Redis connection if we had Redis client setup
    // For now, just return up
    return { status: 'up' };
  }
}