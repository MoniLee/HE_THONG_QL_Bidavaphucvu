import { CanActivate, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Request, Response } from 'express';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import type { AuthenticatedUser } from './auth.service.js';
import { User, UserRole } from './entities/user.entity.js';

type AuthenticatedRequest = Request & { user?: AuthenticatedUser };

interface AccessTokenPayload {
  sub: number;
}

function getCookie(cookieHeader: string | undefined, name: string): string | undefined {
  return cookieHeader
    ?.split(';')
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith(`${name}=`))
    ?.slice(name.length + 1);
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  async canActivate(context: Parameters<CanActivate['canActivate']>[0]): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const response = context.switchToHttp().getResponse<Response>();
    const bearerToken = request.headers.authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
    const token = bearerToken ?? getCookie(request.headers.cookie, 'auth_token');

    if (!token) {
      this.unauthorized(request, response);
      return false;
    }

    let payload: AccessTokenPayload;
    try {
      payload = await this.jwtService.verifyAsync<AccessTokenPayload>(token);
    } catch {
      this.unauthorized(request, response);
      return false;
    }

    const user = await this.usersRepository.findOneBy({ id: payload.sub });
    if (!user || !user.isActive) {
      this.unauthorized(request, response);
      return false;
    }
    if (user.role !== UserRole.ADMIN && user.role !== UserRole.STAFF) {
      if (request.path.startsWith('/api/')) {
        response.status(403).json({ message: 'Không có quyền truy cập' });
        return false;
      }
      response.status(403).render('auth/forbidden');
      return false;
    }

    const publicUser: AuthenticatedUser = {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
    };
    request.user = publicUser;
    response.locals.currentUser = publicUser;
    return true;
  }

  private unauthorized(request: Request, response: Response): void {
    if (request.path.startsWith('/api/') || request.path === '/auth/me') {
      response.status(401).json({ message: 'Unauthorized' });
      return;
    }
    const returnTo = encodeURIComponent(request.originalUrl);
    response.redirect(`/auth/login?returnTo=${returnTo}`);
  }
}
