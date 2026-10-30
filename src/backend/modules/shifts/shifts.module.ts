import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Shift } from './entities/shift.entity.js';
import { ShiftsController } from './shifts.controller.js';
import { ShiftsService } from './shifts.service.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [TypeOrmModule.forFeature([Shift]), AuthModule],
  controllers: [ShiftsController],
  providers: [ShiftsService],
  // Export để InvoicesModule dùng khi gán ca vào hóa đơn
  exports: [ShiftsService],
})
export class ShiftsModule {}
