import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard.js';
import { InvoicesService } from './invoices.service.js';
import { CreateInvoiceDto } from './dto/create-invoice.dto.js';

@Controller('api/invoices')
@UseGuards(AuthGuard)
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  // ── GET /api/invoices ─── Lấy tất cả hóa đơn
  @Get()
  findAll() {
    return this.invoicesService.findAll();
  }

  // ── GET /api/invoices/shift/:shiftId ─── Hóa đơn theo ca (đặt trước :id)
  @Get('shift/:shiftId')
  findByShift(@Param('shiftId', ParseIntPipe) shiftId: number) {
    return this.invoicesService.findByShift(shiftId);
  }

  // ── GET /api/invoices/:id ─── Chi tiết một hóa đơn
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.invoicesService.findOne(id);
  }

  // ── POST /api/invoices ─── Tạo hóa đơn thanh toán
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateInvoiceDto) {
    return this.invoicesService.create(dto);
  }
}
