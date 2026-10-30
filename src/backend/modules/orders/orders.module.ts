import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from './entities/order.entity.js';
import { OrderItem } from './entities/order-item.entity.js';
import { OrdersController } from './orders.controller.js';
import { OrdersService } from './orders.service.js';
import { BilliardTablesModule } from '../billiard-tables/billiard-tables.module.js';
import { MenuItemsModule } from '../menu-items/menu-items.module.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, OrderItem]),
    // Dùng BilliardTablesService để start/end game khi tạo/đóng order
    BilliardTablesModule,
    // Dùng MenuItemsService để tra cứu giá món khi thêm vào order
    MenuItemsModule,
    AuthModule,
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
