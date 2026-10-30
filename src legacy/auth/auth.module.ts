import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLog } from '../audit-logs/entities/audit-log.entity.js';
import { AuditLogsService } from '../audit-logs/audit-logs.service.js';
import { getJwtAccessSecret } from './auth.config.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { RefreshToken } from '../users/entities/refresh-token.entity.js';
import { User } from '../users/entities/user.entity.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';
import { JwtStrategy } from './strategies/jwt.strategy.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, RefreshToken, AuditLog]),
    PassportModule,
    JwtModule.register({ secret: getJwtAccessSecret(), signOptions: { expiresIn: '15m' } }),
  ],
  controllers: [AuthController],
  providers: [AuthService, AuditLogsService, JwtStrategy, JwtAuthGuard, RolesGuard],
  exports: [JwtModule, PassportModule, JwtAuthGuard, RolesGuard],
})
export class AuthModule {}
