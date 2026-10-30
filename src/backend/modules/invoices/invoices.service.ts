import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Invoice } from './entities/invoice.entity.js';
import { CreateInvoiceDto } from './dto/create-invoice.dto.js';
import { OrdersService } from '../orders/orders.service.js';
import { ShiftsService } from '../shifts/shifts.service.js';

@Injectable()
export class InvoicesService {
  constructor(
    @InjectRepository(Invoice)
    private readonly invoiceRepo: Repository<Invoice>,

    // Dùng để kiểm tra order và lấy tổng tiền
    private readonly ordersService: OrdersService,

    // Dùng để gán hóa đơn vào ca và cộng doanh thu ca
    private readonly shiftsService: ShiftsService,
  ) {}

  // ─── Lấy tất cả hóa đơn ───────────────────────────────────────────────────
  async findAll(): Promise<Invoice[]> {
    return this.invoiceRepo.find({
      // TypeORM v0.3+: dùng object thay vì string array
      relations: { table: true, order: true, shift: true },
      order: { issuedAt: 'DESC' },
    });
  }

  // ─── Lấy chi tiết một hóa đơn ────────────────────────────────────────────
  async findOne(id: number): Promise<Invoice> {
    const invoice = await this.invoiceRepo.findOne({
      where: { id },
      relations: {
        table: true,
        order: { items: { menuItem: true } },
        shift: true,
      },
    });
    if (!invoice) throw new NotFoundException(`Không tìm thấy hóa đơn ID ${id}`);
    return invoice;
  }

  // ─── Lấy hóa đơn theo ca làm ──────────────────────────────────────────────
  async findByShift(shiftId: number): Promise<Invoice[]> {
    return this.invoiceRepo.find({
      where: { shift: { id: shiftId } },
      relations: { table: true, order: true },
      order: { issuedAt: 'DESC' },
    });
  }

  // ─── Tạo hóa đơn thanh toán ───────────────────────────────────────────────
  async create(dto: CreateInvoiceDto): Promise<Invoice> {
    // Lấy order (phải ở trạng thái BILLED = đã đóng nhưng chưa có invoice)
    const order = await this.ordersService.findOne(dto.orderId);

    if (order.status !== 'BILLED') {
      throw new BadRequestException(
        `Order #${dto.orderId} chưa được đóng. Hãy đóng order trước khi lập hóa đơn.`,
      );
    }

    // Kiểm tra order đã có invoice chưa
    const existingInvoice = await this.invoiceRepo.findOne({
      where: { order: { id: dto.orderId } },
    });
    if (existingInvoice) {
      throw new ConflictException(`Order #${dto.orderId} đã có hóa đơn ID ${existingInvoice.id}`);
    }

    const discount = dto.discount ?? 0;
    const tableAmount = Number(order.tableAmount);
    const itemsAmount = Number(order.itemsAmount);
    const subtotal = tableAmount + itemsAmount;
    const totalAmount = Math.max(0, subtotal - discount);

    // Lấy ca làm (nếu có)
    let shift = null;
    if (dto.shiftId) {
      shift = await this.shiftsService.findOne(dto.shiftId);
      if (shift.status === 'CLOSED') {
        throw new ConflictException(`Ca làm ID ${dto.shiftId} đã đóng, không thể thêm hóa đơn`);
      }
    }

    const invoice = this.invoiceRepo.create({
      table: order.table,
      order,
      shift,
      issuedAt: new Date(),
      tableAmount,
      itemsAmount,
      subtotal,
      discount,
      totalAmount,
      paymentMethod: dto.paymentMethod,
      note: dto.note ?? null,
    });

    const saved = await this.invoiceRepo.save(invoice);

    // Cộng doanh thu vào ca làm (nếu có)
    if (shift) {
      await this.shiftsService.addRevenue(shift.id, totalAmount);
    }

    return saved;
  }
}
