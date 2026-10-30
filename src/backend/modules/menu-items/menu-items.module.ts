import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MenuItem } from './entities/menu-item.entity.js';
import { MenuItemsController } from './menu-items.controller.js';
import { MenuItemsService } from './menu-items.service.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [TypeOrmModule.forFeature([MenuItem]), AuthModule],
  controllers: [MenuItemsController],
  providers: [MenuItemsService],
  // Export để OrdersModule dùng khi thêm món vào order
  exports: [MenuItemsService],
})
export class MenuItemsModule {}
