import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module.js';
import { Coupon } from '../coupons/entities/coupon.entity.js';
import { Product } from '../products/entities/product.entity.js';
import { IdempotencyKey } from './entities/idempotency-key.entity.js';
import { OrderItem } from './entities/order-item.entity.js';
import { Order } from './entities/order.entity.js';
import { OrderStatusHistory } from './entities/order-status-history.entity.js';
import { Payment } from './entities/payment.entity.js';
import { OrderStatisticsController } from './order-statistics.controller.js';
import { OrdersController } from './orders.controller.js';
import { OrdersService } from './orders.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Order,
      OrderItem,
      Product,
      Coupon,
      Payment,
      OrderStatusHistory,
      IdempotencyKey,
    ]),
    AuthModule,
  ],
  controllers: [OrdersController, OrderStatisticsController],
  providers: [OrdersService],
})
export class OrdersModule {}
