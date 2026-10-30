import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Invoice } from './entities/invoice.entity.js';
import { InvoicesController } from './invoices.controller.js';
import { InvoicesService } from './invoices.service.js';
import { OrdersModule } from '../orders/orders.module.js';
import { ShiftsModule } from '../shifts/shifts.module.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Invoice]),
    AuthModule,
    // Dùng OrdersService để lấy thông tin order khi tạo invoice
    OrdersModule,
    // Dùng ShiftsService để gán ca làm và cộng doanh thu
    ShiftsModule,
  ],
  controllers: [InvoicesController],
  providers: [InvoicesService],
  exports: [InvoicesService],
})
export class InvoicesModule {}
