import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async updatePreferences(userId: string, preferences: any) {
    // Stub implementation
    return {
      message: 'Preferences updated successfully',
      preferences,
    };
  }
}