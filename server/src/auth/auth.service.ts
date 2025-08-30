import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async getSession(user: any) {
    const dbUser = await this.prisma.user.findUnique({
      where: { id: user.sub },
      include: {
        userPrefs: true,
      },
    });

    if (!dbUser) {
      throw new UnauthorizedException('User not found');
    }

    return {
      user: {
        id: dbUser.id,
        email: dbUser.email,
        username: dbUser.username,
        displayName: dbUser.displayName,
        avatarUrl: dbUser.avatarUrl,
        isAdmin: dbUser.isAdmin,
      },
      preferences: dbUser.userPrefs,
    };
  }

  async handleOAuthCallback(profile: any) {
    // Find or create user
    let user = await this.prisma.user.findUnique({
      where: { githubId: profile.id },
    });

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          email: profile.emails?.[0]?.value || `${profile.username}@github.local`,
          username: profile.username,
          displayName: profile.displayName,
          avatarUrl: profile.photos?.[0]?.value,
          githubId: profile.id,
          lastLoginAt: new Date(),
        },
        include: {
          userPrefs: true,
        },
      });

      // Create default user preferences
      await this.prisma.userPreference.create({
        data: { userId: user.id },
      });
    } else {
      // Update last login
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });
    }

    // Create session
    const payload = {
      sub: user.id,
      email: user.email,
      username: user.username,
    };

    const access_token = this.jwtService.sign(payload);

    await this.prisma.session.create({
      data: {
        userId: user.id,
        token: access_token,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    return { access_token };
  }

  async logout(userId: string) {
    await this.prisma.session.deleteMany({
      where: { userId },
    });

    return { message: 'Logged out successfully' };
  }

  async validateUser(payload: any) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException();
    }

    return user;
  }
}