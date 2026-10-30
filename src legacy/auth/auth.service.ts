import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'node:crypto';
import { Repository } from 'typeorm';
import { AuditLogsService } from '../audit-logs/audit-logs.service.js';
import { User, UserRole } from '../users/entities/user.entity.js';
import { RefreshToken } from '../users/entities/refresh-token.entity.js';
import { ChangePasswordDto } from './dto/change-password.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';

const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000;
const REFRESH_TOKEN_DURATION_MS = 14 * 24 * 60 * 60 * 1000;

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(RefreshToken)
    private readonly refreshTokensRepository: Repository<RefreshToken>,
    private readonly jwtService: JwtService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async register(dto: RegisterDto, ipAddress?: string) {
    const email = dto.email.trim().toLowerCase();
    if (await this.usersRepository.findOneBy({ email })) {
      throw new ConflictException('Email đã được đăng ký');
    }

    const user = this.usersRepository.create({
      email,
      fullName: dto.fullName.trim(),
      password: await bcrypt.hash(dto.password, 12),
      role: UserRole.CUSTOMER,
    });
    const savedUser = await this.usersRepository.save(user);
    await this.auditLogsService.record({
      action: 'REGISTER',
      entity: 'User',
      entityId: savedUser.id,
      userId: savedUser.id,
      ipAddress,
    });

    return this.createSession(savedUser);
  }

  async login(dto: LoginDto, ipAddress?: string) {
    const email = dto.email.trim().toLowerCase();
    const user = await this.usersRepository
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.email = :email', { email })
      .getOne();
    const now = new Date();

    if (!user || !user.isActive || (user.lockedUntil && user.lockedUntil > now)) {
      await this.auditLogsService.record({
        action: 'LOGIN_FAILED',
        entity: 'User',
        entityId: user?.id ?? 'unknown',
        userId: user?.id,
        ipAddress,
      });
      throw new UnauthorizedException('Email hoặc mật khẩu không chính xác');
    }

    if (!(await bcrypt.compare(dto.password, user.password))) {
      user.failedLoginAttempts += 1;
      if (user.failedLoginAttempts >= MAX_LOGIN_ATTEMPTS) {
        user.failedLoginAttempts = 0;
        user.lockedUntil = new Date(now.getTime() + LOCK_DURATION_MS);
      }
      await this.usersRepository.save(user);
      await this.auditLogsService.record({
        action: 'LOGIN_FAILED',
        entity: 'User',
        entityId: user.id,
        userId: user.id,
        ipAddress,
      });
      throw new UnauthorizedException('Email hoặc mật khẩu không chính xác');
    }

    user.failedLoginAttempts = 0;
    user.lockedUntil = null;
    await this.usersRepository.save(user);
    await this.auditLogsService.record({
      action: 'LOGIN_SUCCESS',
      entity: 'User',
      entityId: user.id,
      userId: user.id,
      ipAddress,
    });
    return this.createSession(user);
  }

  async refresh(rawToken: string) {
    const token = await this.refreshTokensRepository.findOne({
      where: { tokenHash: this.hashToken(rawToken), revoked: false },
      relations: { user: true },
    });
    if (!token || token.expiresAt <= new Date() || !token.user.isActive) {
      if (token && !token.revoked) {
        token.revoked = true;
        await this.refreshTokensRepository.save(token);
      }
      throw new UnauthorizedException('Refresh token không hợp lệ hoặc đã hết hạn');
    }

    token.revoked = true;
    await this.refreshTokensRepository.save(token);
    return this.createSession(token.user);
  }

  async logout(userId: number, ipAddress?: string): Promise<{ message: string }> {
    await this.refreshTokensRepository.update({ userId, revoked: false }, { revoked: true });
    await this.auditLogsService.record({
      action: 'LOGOUT',
      entity: 'User',
      entityId: userId,
      userId,
      ipAddress,
    });
    return { message: 'Đã đăng xuất và thu hồi refresh token' };
  }

  async me(userId: number) {
    const user = await this.usersRepository.findOneBy({ id: userId });
    if (!user || !user.isActive) {
      throw new UnauthorizedException();
    }
    return this.publicUser(user);
  }

  async changePassword(userId: number, dto: ChangePasswordDto, ipAddress?: string) {
    const user = await this.usersRepository
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.id = :userId', { userId })
      .getOne();
    if (!user || !(await bcrypt.compare(dto.currentPassword, user.password))) {
      throw new UnauthorizedException('Mật khẩu hiện tại không chính xác');
    }

    user.password = await bcrypt.hash(dto.newPassword, 12);
    await this.usersRepository.save(user);
    await this.refreshTokensRepository.update({ userId, revoked: false }, { revoked: true });
    await this.auditLogsService.record({
      action: 'CHANGE_PASSWORD',
      entity: 'User',
      entityId: userId,
      userId,
      ipAddress,
    });
    return { message: 'Đã đổi mật khẩu; vui lòng đăng nhập lại' };
  }

  private async createSession(user: User) {
    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
      email: user.email,
      role: user.role,
    });
    const refreshToken = randomBytes(48).toString('base64url');
    await this.refreshTokensRepository.save(
      this.refreshTokensRepository.create({
        tokenHash: this.hashToken(refreshToken),
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_DURATION_MS),
        userId: user.id,
      }),
    );
    return {
      accessToken,
      refreshToken,
      user: this.publicUser(user),
    };
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private publicUser(user: User) {
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
    };
  }
}
