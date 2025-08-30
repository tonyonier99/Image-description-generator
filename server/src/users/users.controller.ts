import { Controller, Get, Put, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('preferences')
@Controller('prefs')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'Get user preferences' })
  async getPreferences() {
    // Stub implementation
    return {
      snapEnabled: false,
      snapThreshold: 10,
      rulersEnabled: false,
      gridEnabled: false,
      gridSpacing: 20,
      gridOpacity: 0.3,
      autoSave: true,
      theme: 'dark',
      language: 'zh-Hant',
    };
  }

  @Put()
  @ApiOperation({ summary: 'Update user preferences' })
  async updatePreferences(@Body() preferences: any) {
    // Stub implementation
    return this.usersService.updatePreferences('user-id', preferences);
  }
}