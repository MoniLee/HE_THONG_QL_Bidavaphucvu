import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Invoice } from '../invoices/entities/invoice.entity.js';
import { Shift } from '../shifts/entities/shift.entity.js';
import { RevenueController } from './revenue.controller.js';
import { RevenueService } from './revenue.service.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  // Revenue không có entity riêng, truy vấn trực tiếp Invoice và Shift
  imports: [TypeOrmModule.forFeature([Invoice, Shift]), AuthModule],
  controllers: [RevenueController],
  providers: [RevenueService],
  // Export để AppController có thể inject RevenueService
  exports: [RevenueService],
})
export class RevenueModule {}
