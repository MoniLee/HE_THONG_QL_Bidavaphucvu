import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { User, UserRole } from './entities/user.entity.js';

const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000;

export interface AuthenticatedUser {
  id: number;
  email: string;
  fullName: string;
  role: UserRole;
}

export interface AuthSession {
  accessToken: string;
  user: AuthenticatedUser;
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthSession> {
    const email = dto.email.trim().toLowerCase();
    if (await this.usersRepository.findOneBy({ email })) {
      throw new ConflictException('Email đã được đăng ký');
    }

    const user = this.usersRepository.create({
      email,
      fullName: dto.fullName.trim(),
      password: await bcrypt.hash(dto.password, 12),
      role: UserRole.STAFF,
    });
    const savedUser = await this.usersRepository.save(user);
    return this.createSession(savedUser);
  }

  async login(dto: LoginDto): Promise<AuthSession> {
    const email = dto.email.trim().toLowerCase();
    const user = await this.usersRepository
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.email = :email', { email })
      .getOne();

    const now = new Date();
    if (
      !user ||
      !user.isActive ||
      (user.lockedUntil !== null && user.lockedUntil > now)
    ) {
      throw new UnauthorizedException('Email hoặc mật khẩu không chính xác');
    }

    if (!(await bcrypt.compare(dto.password, user.password))) {
      user.failedLoginAttempts += 1;
      if (user.failedLoginAttempts >= MAX_LOGIN_ATTEMPTS) {
        user.failedLoginAttempts = 0;
        user.lockedUntil = new Date(now.getTime() + LOCK_DURATION_MS);
      }
      await this.usersRepository.save(user);
      throw new UnauthorizedException('Email hoặc mật khẩu không chính xác');
    }

    user.failedLoginAttempts = 0;
    user.lockedUntil = null;
    await this.usersRepository.save(user);
    return this.createSession(user);
  }

  private async createSession(user: User): Promise<AuthSession> {
    const publicUser = this.toPublicUser(user);
    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
      email: user.email,
      role: user.role,
    });
    return { accessToken, user: publicUser };
  }

  toPublicUser(user: User): AuthenticatedUser {
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
    };
  }
}
