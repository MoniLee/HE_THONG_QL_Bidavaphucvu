import {
  Body,
  Controller,
  Get,
  Headers,
  Ip,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { UserRole } from '../users/entities/user.entity.js';
import { CreateOrderDto } from './dto/create-order.dto.js';
import { CreatePaymentDto } from './dto/create-payment.dto.js';
import { FindOrdersQueryDto } from './dto/find-orders-query.dto.js';
import { TopProductsQueryDto } from './dto/top-products-query.dto.js';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto.js';
import { OrdersService } from './orders.service.js';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.CUSTOMER)
  @Post()
  create(
    @Body() createOrderDto: CreateOrderDto,
    @CurrentUser() user: AuthenticatedUser,
    @Ip() ipAddress: string,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return this.ordersService.create(createOrderDto, idempotencyKey, user.id, ipAddress);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @Get('statistics/revenue')
  getRevenue() {
    return this.ordersService.getRevenue();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @Get('statistics/top-products')
  getTopProducts(@Query() query: TopProductsQueryDto) {
    return this.ordersService.getTopProducts(query.limit);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @Get()
  findAll(@Query() query: FindOrdersQueryDto) {
    return this.ordersService.findAll(query);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CUSTOMER)
  @Get('my')
  findMyOrders(@CurrentUser() user: AuthenticatedUser, @Query() query: FindOrdersQueryDto) {
    return this.ordersService.findMine(user.id, query);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthenticatedUser) {
    return this.ordersService.findOne(id, user.id, user.role as UserRole);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/history')
  getHistory(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthenticatedUser) {
    return this.ordersService.getHistory(id, user.id, user.role as UserRole);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/payments')
  createPayment(
    @Param('id', ParseIntPipe) id: number,
    @Body() createPaymentDto: CreatePaymentDto,
    @CurrentUser() user: AuthenticatedUser,
    @Ip() ipAddress: string,
  ) {
    return this.ordersService.createPayment(id, createPaymentDto, user.id, user.role as UserRole, ipAddress);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/payments')
  getPayment(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthenticatedUser) {
    return this.ordersService.getPayment(id, user.id, user.role as UserRole);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @Post(':id/refund')
  refund(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthenticatedUser, @Ip() ipAddress: string) {
    return this.ordersService.refund(id, user.id, user.role as UserRole, ipAddress);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @Patch(':id/status')
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateOrderStatusDto: UpdateOrderStatusDto,
    @CurrentUser() user: AuthenticatedUser,
    @Ip() ipAddress: string,
  ) {
    return this.ordersService.updateStatus(id, updateOrderStatusDto.status, user.id, ipAddress);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/cancel')
  cancel(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthenticatedUser, @Ip() ipAddress: string) {
    return this.ordersService.cancel(id, user.id, user.role as UserRole, ipAddress);
  }
}
