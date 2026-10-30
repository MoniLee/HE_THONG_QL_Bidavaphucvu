import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { databaseConfig } from './database/database.config.js';

// Import controller và service chính (render EJS)
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';

// Import tất cả modules chức năng
import { BilliardTablesModule } from './modules/billiard-tables/billiard-tables.module.js';
import { MenuItemsModule } from './modules/menu-items/menu-items.module.js';
import { OrdersModule } from './modules/orders/orders.module.js';
import { InvoicesModule } from './modules/invoices/invoices.module.js';
import { ShiftsModule } from './modules/shifts/shifts.module.js';
import { RevenueModule } from './modules/revenue/revenue.module.js';
import { AuthModule } from './modules/auth/auth.module.js';

@Module({
  imports: [
    // Kết nối MySQL XAMPP qua TypeORM
    TypeOrmModule.forRoot(databaseConfig),

    // Đăng ký tất cả module chức năng
    BilliardTablesModule,
    MenuItemsModule,
    OrdersModule,
    InvoicesModule,
    ShiftsModule,
    RevenueModule,
    AuthModule,
  ],
  // AppController dùng service từ các module trên, cần khai báo ở đây
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
