import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { getJwtAccessSecret } from './auth.config.js';
import { AuthController } from './auth.controller.js';
import { AuthGuard } from './auth.guard.js';
import { AuthService } from './auth.service.js';
import { User } from './entities/user.entity.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    JwtModule.register({
      secret: getJwtAccessSecret(),
      signOptions: { expiresIn: '8h' },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, AuthGuard],
  // Export AuthGuard để AppController dùng
  // Export JwtModule → JwtService khả dụng khi AuthGuard chạy trong AppModule
  // Export TypeOrmModule → UserRepository khả dụng khi AuthGuard query DB
  exports: [AuthGuard, JwtModule, TypeOrmModule],
})
export class AuthModule {}
