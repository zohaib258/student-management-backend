
import {
  Body,
  Controller,
  Get,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { SessionAuthGuard } from '../common/session-auth.guard';
import { ProfileService } from './profile.service';

@Controller('api')
@UseGuards(SessionAuthGuard)
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Get('profile')
  getProfile(@Req() req: Request) {
    const userId = (req as any).session.userId;
    return this.profileService.getProfile(userId);
  }

  @Post('profile')
  saveProfile(@Req() req: Request, @Body() body: any) {
    const userId = (req as any).session.userId;
    return this.profileService.saveProfile(userId, body, false);
  }

  @Put('profile')
  updateProfile(@Req() req: Request, @Body() body: any) {
    const userId = (req as any).session.userId;
    return this.profileService.saveProfile(userId, body, true);
  }

  @Post('change-password')
  changePassword(@Req() req: Request, @Body() body: any) {
    const userId = (req as any).session.userId;

    return this.profileService.changePassword(
      userId,
      body?.currentPassword,
      body?.newPassword,
    );
  }
}
