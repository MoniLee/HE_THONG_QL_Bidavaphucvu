import {
  Body,
  ConflictException,
  Controller,
  Get,
  Post,
  Query,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthGuard } from './auth.guard.js';
import { AuthService } from './auth.service.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';

const SESSION_DURATION_MS = 8 * 60 * 60 * 1000;

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('login')
  loginPage(
    @Query('error') error: string | undefined,
    @Query('returnTo') returnTo: string | undefined,
    @Res() response: Response,
  ) {
    return response.render('auth/login', {
      error,
      returnTo: this.safeReturnTo(returnTo),
    });
  }

  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Req() request: Request,
    @Res() response: Response,
  ) {
    try {
      const session = await this.authService.login(dto);
      this.setSessionCookie(response, session.accessToken);
      if (request.is('application/json')) {
        return response.json(session);
      }
      return response.redirect(this.safeReturnTo(request.body?.returnTo));
    } catch (error) {
      if (!(error instanceof UnauthorizedException)) {
        throw error;
      }
      if (request.is('application/json')) {
        return response.status(401).json({ message: error.message });
      }
      return response.redirect(
        `/auth/login?error=${encodeURIComponent(error.message)}&returnTo=${encodeURIComponent(
          this.safeReturnTo(request.body?.returnTo),
        )}`,
      );
    }
  }

  @Get('register')
  registerPage(
    @Query('error') error: string | undefined,
    @Res() response: Response,
  ) {
    return response.render('auth/register', { error });
  }

  @Post('register')
  async register(
    @Body() dto: RegisterDto,
    @Req() request: Request,
    @Res() response: Response,
  ) {
    try {
      const session = await this.authService.register(dto);
      this.setSessionCookie(response, session.accessToken);
      if (request.is('application/json')) {
        return response.status(201).json(session);
      }
      return response.redirect('/');
    } catch (error) {
      if (!(error instanceof ConflictException)) {
        throw error;
      }
      if (request.is('application/json')) {
        return response.status(409).json({ message: error.message });
      }
      return response.redirect(
        `/auth/register?error=${encodeURIComponent(error.message)}`,
      );
    }
  }

  @Post('logout')
  logout(@Req() request: Request, @Res() response: Response) {
    response.clearCookie('auth_token', this.cookieOptions());
    if (request.is('application/json')) {
      return response.json({ message: 'Đã đăng xuất' });
    }
    return response.redirect('/auth/login');
  }

  @UseGuards(AuthGuard)
  @Get('me')
  me(@Req() request: Request & { user?: unknown }) {
    return request.user;
  }

  private setSessionCookie(response: Response, accessToken: string): void {
    response.cookie('auth_token', accessToken, {
      ...this.cookieOptions(),
      maxAge: SESSION_DURATION_MS,
    });
  }

  private cookieOptions() {
    return {
      httpOnly: true,
      sameSite: 'strict' as const,
      secure: process.env.NODE_ENV === 'production',
      path: '/',
    };
  }

  private safeReturnTo(value: unknown): string {
    if (
      typeof value !== 'string' ||
      !value.startsWith('/') ||
      value.startsWith('//') ||
      value.startsWith('/auth/')
    ) {
      return '/';
    }
    return value;
  }
}
