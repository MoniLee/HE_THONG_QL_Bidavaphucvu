import {
  Body,
  Controller,
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
import { ShiftsService } from './shifts.service.js';
import { CreateShiftDto } from './dto/create-shift.dto.js';
import { CloseShiftDto } from './dto/close-shift.dto.js';

@Controller('api/shifts')
@UseGuards(AuthGuard)
export class ShiftsController {
  constructor(private readonly shiftsService: ShiftsService) {}

  // ── GET /api/shifts ─── Lấy tất cả ca làm
  @Get()
  findAll() {
    return this.shiftsService.findAll();
  }

  // ── GET /api/shifts/open ─── Lấy ca đang mở (đặt trước :id)
  @Get('open')
  findOpenShift() {
    return this.shiftsService.findOpenShift();
  }

  // ── GET /api/shifts/:id ─── Chi tiết một ca
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.shiftsService.findOne(id);
  }

  // ── GET /api/shifts/:id/summary ─── Tóm tắt doanh thu ca
  @Get(':id/summary')
  getShiftSummary(@Param('id', ParseIntPipe) id: number) {
    return this.shiftsService.getShiftSummary(id);
  }

  // ── POST /api/shifts ─── Mở ca làm mới
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateShiftDto) {
    return this.shiftsService.create(dto);
  }

  // ── PATCH /api/shifts/:id/close ─── Đóng ca làm
  @Patch(':id/close')
  closeShift(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CloseShiftDto,
  ) {
    return this.shiftsService.closeShift(id, dto);
  }
}
