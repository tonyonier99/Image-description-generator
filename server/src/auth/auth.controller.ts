import { Controller, Get, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { GithubOAuthGuard } from './guards/github-oauth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('session')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get current session' })
  @ApiResponse({ status: 200, description: 'Current user session' })
  async getSession(@Req() req: Request) {
    return this.authService.getSession(req.user);
  }

  @Post('callback/github')
  @UseGuards(GithubOAuthGuard)
  @ApiOperation({ summary: 'GitHub OAuth callback' })
  @ApiResponse({ status: 200, description: 'OAuth success' })
  async githubCallback(@Req() req: Request, @Res() res: Response) {
    const result = await this.authService.handleOAuthCallback(req.user);
    
    // Redirect with token
    const redirectUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}?token=${result.access_token}`;
    res.redirect(redirectUrl);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Logout' })
  @ApiResponse({ status: 200, description: 'Logout successful' })
  async logout(@Req() req: Request) {
    return this.authService.logout(req.user.sub);
  }
}