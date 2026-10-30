import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard.js';
import { MenuItemsService } from './menu-items.service.js';
import { CreateMenuItemDto } from './dto/create-menu-item.dto.js';
import { UpdateMenuItemDto } from './dto/update-menu-item.dto.js';

@Controller('api/menu-items')
@UseGuards(AuthGuard)
export class MenuItemsController {
  constructor(private readonly menuItemsService: MenuItemsService) {}

  // ── GET /api/menu-items?available=true ─── Lấy tất cả món (tùy chọn lọc)
  @Get()
  findAll(@Query('available') available?: string) {
    // Nếu query ?available=true thì chỉ lấy món đang bán
    return this.menuItemsService.findAll(available === 'true');
  }

  // ── GET /api/menu-items/:id ─── Lấy chi tiết một món
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.menuItemsService.findOne(id);
  }

  // ── POST /api/menu-items ─── Tạo món mới
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateMenuItemDto) {
    return this.menuItemsService.create(dto);
  }

  // ── PATCH /api/menu-items/:id ─── Cập nhật món
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateMenuItemDto,
  ) {
    return this.menuItemsService.update(id, dto);
  }

  // ── DELETE /api/menu-items/:id ─── Xóa món
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.menuItemsService.remove(id);
  }
}
