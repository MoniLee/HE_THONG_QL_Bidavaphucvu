import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BilliardTable } from './entities/billiard-table.entity.js';
import { BilliardTablesController } from './billiard-tables.controller.js';
import { BilliardTablesService } from './billiard-tables.service.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  // Đăng ký entity BilliardTable để inject Repository vào service
  imports: [TypeOrmModule.forFeature([BilliardTable]), AuthModule],
  controllers: [BilliardTablesController],
  providers: [BilliardTablesService],
  // Export service để các module khác (orders, invoices) có thể dùng
  exports: [BilliardTablesService],
})
export class BilliardTablesModule {}
