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
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard.js';
import { BilliardTablesService } from './billiard-tables.service.js';
import { CreateBilliardTableDto } from './dto/create-billiard-table.dto.js';
import { UpdateBilliardTableDto } from './dto/update-billiard-table.dto.js';
import { UpdateTableStatusDto } from './dto/update-table-status.dto.js';

@Controller('api/billiard-tables')
@UseGuards(AuthGuard)
export class BilliardTablesController {
  constructor(private readonly billiardTablesService: BilliardTablesService) {}

  // ── GET /api/billiard-tables ─── Lấy tất cả bàn
  @Get()
  findAll() {
    return this.billiardTablesService.findAll();
  }

  // ── GET /api/billiard-tables/active ─── Lấy bàn đang chơi
  // Đặt trước :id để tránh bị parse thành số
  @Get('active')
  findActiveTables() {
    return this.billiardTablesService.findActiveTables();
  }

  // ── GET /api/billiard-tables/:id ─── Lấy chi tiết một bàn
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.billiardTablesService.findOne(id);
  }

  // ── GET /api/billiard-tables/:id/bill ─── Xem hóa đơn tạm tính
  @Get(':id/bill')
  calculateBill(@Param('id', ParseIntPipe) id: number) {
    return this.billiardTablesService.calculateBill(id);
  }

  // ── POST /api/billiard-tables ─── Tạo bàn mới
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateBilliardTableDto) {
    return this.billiardTablesService.create(dto);
  }

  // ── PATCH /api/billiard-tables/:id ─── Cập nhật tên/giá bàn
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateBilliardTableDto,
  ) {
    return this.billiardTablesService.update(id, dto);
  }

  // ── PATCH /api/billiard-tables/:id/status ─── Đổi trạng thái thủ công
  @Patch(':id/status')
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTableStatusDto,
  ) {
    return this.billiardTablesService.updateStatus(id, dto);
  }

  // ── PATCH /api/billiard-tables/:id/start ─── Bắt đầu phiên chơi
  @Patch(':id/start')
  startGame(@Param('id', ParseIntPipe) id: number) {
    return this.billiardTablesService.startGame(id);
  }

  // ── PATCH /api/billiard-tables/:id/end ─── Kết thúc phiên chơi
  @Patch(':id/end')
  endGame(@Param('id', ParseIntPipe) id: number) {
    return this.billiardTablesService.endGame(id);
  }

  // ── DELETE /api/billiard-tables/:id ─── Xóa bàn
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.billiardTablesService.remove(id);
  }
}
