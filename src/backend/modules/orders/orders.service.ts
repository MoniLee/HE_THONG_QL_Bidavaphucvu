import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Order } from './entities/order.entity.js';
import { OrderItem } from './entities/order-item.entity.js';
import { BilliardTablesService } from '../billiard-tables/billiard-tables.service.js';
import { MenuItemsService } from '../menu-items/menu-items.service.js';
import { CreateOrderDto, AddItemsToOrderDto } from './dto/create-order.dto.js';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,

    @InjectRepository(OrderItem)
    private readonly orderItemRepo: Repository<OrderItem>,

    // Service quản lý bàn (dùng để bắt đầu/kết thúc phiên chơi)
    private readonly tableService: BilliardTablesService,

    // Service thực đơn (dùng để lấy giá tại thời điểm gọi món)
    private readonly menuService: MenuItemsService,
  ) {}

  // ─── Helper: tìm order kèm items và bàn ───────────────────────────────────
  private async getOrderOrThrow(id: number): Promise<Order> {
    const order = await this.orderRepo.findOne({
      where: { id },
      // TypeORM v0.3+: dùng object thay vì string array
      relations: { table: true, items: { menuItem: true }, invoice: true },
    });
    if (!order) throw new NotFoundException(`Không tìm thấy order với ID ${id}`);
    return order;
  }

  // ─── Lấy tất cả orders (kèm thông tin bàn) ────────────────────────────────
  async findAll(): Promise<Order[]> {
    return this.orderRepo.find({
      relations: { table: true, items: { menuItem: true } },
      order: { createdAt: 'DESC' },
    });
  }

  // ─── Lấy orders đang mở (chưa thanh toán) ─────────────────────────────────
  async findOpenOrders(): Promise<Order[]> {
    return this.orderRepo.find({
      where: { status: 'OPEN' },
      relations: { table: true, items: { menuItem: true } },
      order: { createdAt: 'DESC' },
    });
  }

  // ─── Lấy chi tiết một order ────────────────────────────────────────────────
  async findOne(id: number): Promise<Order> {
    return this.getOrderOrThrow(id);
  }

  // ─── Lấy orders theo bàn ──────────────────────────────────────────────────
  async findByTable(tableId: number): Promise<Order[]> {
    return this.orderRepo.find({
      where: { table: { id: tableId } },
      relations: { items: { menuItem: true } },
      order: { createdAt: 'DESC' },
    });
  }

  // ─── Tạo order mới = bắt đầu phiên chơi bàn ──────────────────────────────
  async create(dto: CreateOrderDto): Promise<Order> {
    // Kiểm tra bàn đã có order OPEN chưa
    const existingOpen = await this.orderRepo.findOne({
      where: { table: { id: dto.tableId }, status: 'OPEN' },
    });
    if (existingOpen) {
      throw new ConflictException(
        `Bàn ID ${dto.tableId} đang có order mở (ID: ${existingOpen.id}). Hãy đóng order trước.`,
      );
    }

    // Gọi service bàn để bắt đầu phiên chơi (set OCCUPIED, ghi startTime)
    const table = await this.tableService.startGame(dto.tableId);

    const order = this.orderRepo.create({
      table,
      startTime: table.startTime!,
      status: 'OPEN',
      note: dto.note ?? null,
      durationHours: 0,
      tableAmount: 0,
      itemsAmount: 0,
      totalAmount: 0,
    });
    return this.orderRepo.save(order);
  }

  // ─── Thêm món vào order đang mở ──────────────────────────────────────────
  async addItems(orderId: number, dto: AddItemsToOrderDto): Promise<Order> {
    const order = await this.getOrderOrThrow(orderId);

    if (order.status !== 'OPEN') {
      throw new ConflictException(
        `Order #${orderId} không ở trạng thái OPEN, không thể thêm món`,
      );
    }

    // Xử lý từng dòng món
    for (const itemDto of dto.items) {
      const menuItem = await this.menuService.findOne(itemDto.menuItemId);

      if (!menuItem.isAvailable) {
        throw new ConflictException(`Món "${menuItem.name}" hiện không còn bán`);
      }

      const unitPrice = Number(menuItem.price);
      const subtotal = unitPrice * itemDto.quantity;

      const orderItem = this.orderItemRepo.create({
        order,
        menuItem,
        quantity: itemDto.quantity,
        unitPrice,
        subtotal,
        note: itemDto.note ?? null,
      });
      await this.orderItemRepo.save(orderItem);

      // Cộng dồn tiền món vào order
      order.itemsAmount = Number(order.itemsAmount) + subtotal;
    }

    order.totalAmount = Number(order.tableAmount) + Number(order.itemsAmount);
    return this.orderRepo.save(order);
  }

  // ─── Xóa một món khỏi order đang mở ─────────────────────────────────────
  async removeItem(orderId: number, itemId: number): Promise<Order> {
    const order = await this.getOrderOrThrow(orderId);

    if (order.status !== 'OPEN') {
      throw new ConflictException('Chỉ có thể xóa món khi order đang OPEN');
    }

    const item = await this.orderItemRepo.findOne({
      where: { id: itemId, order: { id: orderId } },
    });
    if (!item) {
      throw new NotFoundException(`Không tìm thấy dòng món ID ${itemId} trong order #${orderId}`);
    }

    // Trừ lại tiền món
    order.itemsAmount = Number(order.itemsAmount) - Number(item.subtotal);
    order.totalAmount = Number(order.tableAmount) + Number(order.itemsAmount);

    await this.orderItemRepo.remove(item);
    return this.orderRepo.save(order);
  }

  // ─── Xem hóa đơn tạm tính (chưa đóng order) ──────────────────────────────
  async previewBill(orderId: number): Promise<{
    orderId: number;
    tableName: string;
    startTime: Date;
    currentTime: Date;
    durationHours: number;
    pricePerHour: number;
    tableAmount: number;
    itemsAmount: number;
    totalAmount: number;
    items: { name: string; quantity: number; unitPrice: number; subtotal: number }[];
  }> {
    const order = await this.getOrderOrThrow(orderId);
    if (order.status !== 'OPEN') {
      throw new ConflictException('Chỉ xem tạm tính khi order đang OPEN');
    }

    // Tính tiền bàn tạm thời (chưa kết thúc)
    const bill = await this.tableService.calculateBill(order.table.id);

    return {
      orderId: order.id,
      tableName: order.table.name,
      startTime: order.startTime,
      currentTime: bill.currentTime,
      durationHours: bill.durationHours,
      pricePerHour: bill.pricePerHour,
      tableAmount: bill.tableAmount,
      itemsAmount: Number(order.itemsAmount),
      totalAmount: bill.tableAmount + Number(order.itemsAmount),
      items: order.items.map((i) => ({
        name: i.menuItem.name,
        quantity: i.quantity,
        unitPrice: Number(i.unitPrice),
        subtotal: Number(i.subtotal),
      })),
    };
  }

  // ─── Đóng order = kết thúc phiên chơi (chuẩn bị tạo invoice) ────────────
  async closeOrder(orderId: number): Promise<Order> {
    const order = await this.getOrderOrThrow(orderId);

    if (order.status !== 'OPEN') {
      throw new ConflictException(`Order #${orderId} không ở trạng thái OPEN`);
    }

    // Kết thúc phiên chơi tại bàn
    const result = await this.tableService.endGame(order.table.id);

    order.endTime = result.endTime;
    order.durationHours = result.durationHours;
    order.tableAmount = result.tableAmount;
    order.itemsAmount = Number(order.itemsAmount);
    order.totalAmount = result.tableAmount + Number(order.itemsAmount);
    order.status = 'BILLED';

    return this.orderRepo.save(order);
  }

  // ─── Hủy order (chỉ được khi đang OPEN) ──────────────────────────────────
  async cancelOrder(orderId: number): Promise<Order> {
    const order = await this.getOrderOrThrow(orderId);

    if (order.status !== 'OPEN') {
      throw new ConflictException('Chỉ có thể hủy order đang OPEN');
    }

    // Trả bàn về AVAILABLE nếu đang chơi
    if (order.table.isActive) {
      await this.tableService.endGame(order.table.id);
    }

    order.status = 'CANCELLED';
    order.endTime = new Date();
    return this.orderRepo.save(order);
  }
}
