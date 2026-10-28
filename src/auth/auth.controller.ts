
import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';

@Controller()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('api/register')
  async register(@Body() body: any) {
    return this.authService.register(body?.email, body?.password);
  }

  @Post('api/login')
  async login(
    @Body() body: any,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const result = await this.authService.login(body?.email, body?.password);
    const user = result.user;
    const sessionReq = req as any;

    await new Promise<void>((resolve, reject) => {
      sessionReq.session.regenerate((error: Error | null) => {
        if (error) reject(error);
        else resolve();
      });
    }).catch((error) => {
      console.error('Session regeneration error:', error);
      res.status(500).json({ message: 'Unable to start your session.' });
    });

    if (res.headersSent) return;

    sessionReq.session.userId = user.id;
    sessionReq.session.email = user.email;
    sessionReq.session.role = user.role;

    try {
      await new Promise<void>((resolve, reject) => {
        sessionReq.session.save((error: Error | null) => {
          if (error) reject(error);
          else resolve();
        });
      });
      return res.status(200).json(result);
    } catch (error) {
      console.error('Session save error:', error);
      return res
        .status(500)
        .json({ message: 'Unable to save your login session.' });
    }
  }

  @Get('api/session')
  async getSession(@Req() req: Request, @Res() res: Response) {
    const sessionReq = req as any;

    if (!sessionReq.session || !sessionReq.session.userId) {
      return res.status(401).json({
        authenticated: false,
        message: 'No active login session.',
      });
    }

    try {
      const result = await this.authService.getSession(
        sessionReq.session.userId,
      );
      return res.status(200).json(result);
    } catch (error: any) {
      if (error?.status === 401) {
        return res.status(401).json({
          authenticated: false,
          message: 'User account not found.',
        });
      }

      console.error('Session check error:', error);
      return res
        .status(500)
        .json({ message: 'Unable to retrieve session information.' });
    }
  }

  @Post('api/logout')
  async logout(@Req() req: Request, @Res() res: Response) {
    const sessionReq = req as any;

    if (!sessionReq.session) {
      return res.status(200).json({
        message: 'Logged out successfully.',
      });
    }

    sessionReq.session.destroy((error: Error | null) => {
      if (error) {
        console.error('Logout error:', error);
        return res.status(500).json({ message: 'Unable to log out.' });
      }

      res.clearCookie('nest.sid');
      return res.status(200).json({
        message: 'Logged out successfully.',
      });
    });
  }

  @Post('api/admin/register')
  async registerAdmin(@Body() body: any) {
    return this.authService.registerAdmin(body?.email, body?.password);
  }

  @Post('api/admin/login')
  async loginAdmin(
    @Body() body: any,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const result = await this.authService.loginAdmin(
      body?.email,
      body?.password,
    );
    const admin = result.admin;
    const sessionReq = req as any;

    try {
      await new Promise<void>((resolve, reject) => {
        sessionReq.session.regenerate((error: Error | null) => {
          if (error) reject(error);
          else resolve();
        });
      });
    } catch (error) {
      console.error('Admin session error:', error);
      return res.status(500).json({
        message: 'Unable to start your admin session.',
      });
    }

    sessionReq.session.userId = admin.id;
    sessionReq.session.email = admin.email;
    sessionReq.session.role = 'admin';

    try {
      await new Promise<void>((resolve, reject) => {
        sessionReq.session.save((error: Error | null) => {
          if (error) reject(error);
          else resolve();
        });
      });

      return res.status(200).json(result);
    } catch (error) {
      console.error('Admin session save error:', error);
      return res.status(500).json({
        message: 'Unable to save your admin session.',
      });
    }
  }
}
