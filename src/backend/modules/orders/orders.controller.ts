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
import { OrdersService } from './orders.service.js';
import { CreateOrderDto, AddItemsToOrderDto } from './dto/create-order.dto.js';

@Controller('api/orders')
@UseGuards(AuthGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  // ── GET /api/orders ─── Lấy tất cả orders
  @Get()
  findAll() {
    return this.ordersService.findAll();
  }

  // ── GET /api/orders/open ─── Lấy orders đang mở (đặt trước :id)
  @Get('open')
  findOpenOrders() {
    return this.ordersService.findOpenOrders();
  }

  // ── GET /api/orders/:id ─── Chi tiết một order
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.ordersService.findOne(id);
  }

  // ── GET /api/orders/table/:tableId ─── Orders theo bàn
  @Get('table/:tableId')
  findByTable(@Param('tableId', ParseIntPipe) tableId: number) {
    return this.ordersService.findByTable(tableId);
  }

  // ── GET /api/orders/:id/preview-bill ─── Xem hóa đơn tạm tính
  @Get(':id/preview-bill')
  previewBill(@Param('id', ParseIntPipe) id: number) {
    return this.ordersService.previewBill(id);
  }

  // ── POST /api/orders ─── Tạo order mới (bắt đầu phiên chơi)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateOrderDto) {
    return this.ordersService.create(dto);
  }

  // ── POST /api/orders/:id/items ─── Thêm món vào order
  @Post(':id/items')
  addItems(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AddItemsToOrderDto,
  ) {
    return this.ordersService.addItems(id, dto);
  }

  // ── DELETE /api/orders/:id/items/:itemId ─── Xóa một dòng món
  @Delete(':id/items/:itemId')
  removeItem(
    @Param('id', ParseIntPipe) id: number,
    @Param('itemId', ParseIntPipe) itemId: number,
  ) {
    return this.ordersService.removeItem(id, itemId);
  }

  // ── PATCH /api/orders/:id/close ─── Đóng order (kết thúc phiên chơi)
  @Patch(':id/close')
  closeOrder(@Param('id', ParseIntPipe) id: number) {
    return this.ordersService.closeOrder(id);
  }

  // ── PATCH /api/orders/:id/cancel ─── Hủy order
  @Patch(':id/cancel')
  cancelOrder(@Param('id', ParseIntPipe) id: number) {
    return this.ordersService.cancelOrder(id);
  }
}
