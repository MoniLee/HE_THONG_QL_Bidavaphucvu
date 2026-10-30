import { Body, Controller, Get, Ip, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { UserRole } from '../users/entities/user.entity.js';
import { UpdateCouponDto } from './dto/update-coupon.dto.js';
import { UpdateCouponStatusDto } from './dto/update-coupon-status.dto.js';
import { CreateCouponDto } from './dto/create-coupon.dto.js';
import { CouponsService } from './coupons.service.js';

@Controller('coupons')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CouponsController {
  constructor(private readonly couponsService: CouponsService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  create(
    @Body() createCouponDto: CreateCouponDto,
    @CurrentUser() user: AuthenticatedUser,
    @Ip() ipAddress: string,
  ) {
    return this.couponsService.create(createCouponDto, user.id, ipAddress);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCouponDto,
    @CurrentUser() user: AuthenticatedUser,
    @Ip() ipAddress: string,
  ) {
    return this.couponsService.update(id, dto, user.id, ipAddress);
  }

  @Patch(':id/status')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  setActive(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCouponStatusDto,
    @CurrentUser() user: AuthenticatedUser,
    @Ip() ipAddress: string,
  ) {
    return this.couponsService.setActive(id, dto.isActive, user.id, ipAddress);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.CUSTOMER)
  findAll() {
    return this.couponsService.findAll();
  }
}
