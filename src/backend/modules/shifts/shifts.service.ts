import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Shift } from './entities/shift.entity.js';
import { CreateShiftDto } from './dto/create-shift.dto.js';
import { CloseShiftDto } from './dto/close-shift.dto.js';

@Injectable()
export class ShiftsService {
  constructor(
    @InjectRepository(Shift)
    private readonly shiftRepo: Repository<Shift>,
  ) {}

  // ─── Helper: tìm ca theo ID ────────────────────────────────────────────────
  async findOne(id: number): Promise<Shift> {
    const shift = await this.shiftRepo.findOne({ where: { id } });
    if (!shift) throw new NotFoundException(`Không tìm thấy ca làm ID ${id}`);
    return shift;
  }

  // ─── Lấy tất cả ca làm ────────────────────────────────────────────────────
  async findAll(): Promise<Shift[]> {
    return this.shiftRepo.find({ order: { startTime: 'DESC' } });
  }

  // ─── Lấy ca đang mở hiện tại ──────────────────────────────────────────────
  async findOpenShift(): Promise<Shift | null> {
    return this.shiftRepo.findOne({ where: { status: 'OPEN' } });
  }

  // ─── Mở ca làm mới ────────────────────────────────────────────────────────
  async create(dto: CreateShiftDto): Promise<Shift> {
    // Kiểm tra đang có ca mở chưa
    const openShift = await this.findOpenShift();
    if (openShift) {
      throw new ConflictException(
        `Đang có ca làm mở (ID: ${openShift.id} - ${openShift.name}). Hãy đóng ca trước khi mở ca mới.`,
      );
    }

    const shift = this.shiftRepo.create({
      name: dto.name.trim(),
      staffName: dto.staffName.trim(),
      startTime: new Date(),
      status: 'OPEN',
      totalRevenue: 0,
      note: dto.note ?? null,
    });
    return this.shiftRepo.save(shift);
  }

  // ─── Đóng ca làm ──────────────────────────────────────────────────────────
  async closeShift(id: number, dto: CloseShiftDto): Promise<Shift> {
    const shift = await this.findOne(id);

    if (shift.status === 'CLOSED') {
      throw new ConflictException(`Ca làm ID ${id} đã được đóng`);
    }

    shift.status = 'CLOSED';
    shift.endTime = new Date();
    if (dto.note !== undefined) shift.note = dto.note;

    return this.shiftRepo.save(shift);
  }

  // ─── Cộng doanh thu vào ca (gọi từ InvoicesService) ──────────────────────
  async addRevenue(shiftId: number, amount: number): Promise<void> {
    await this.shiftRepo
      .createQueryBuilder()
      .update(Shift)
      .set({ totalRevenue: () => `total_revenue + ${amount}` })
      .where('id = :id', { id: shiftId })
      .execute();
  }

  // ─── Lấy tóm tắt doanh thu một ca ────────────────────────────────────────
  async getShiftSummary(id: number): Promise<{
    shift: Shift;
    totalRevenue: number;
    duration: string;
  }> {
    const shift = await this.shiftRepo.findOne({
      where: { id },
      // TypeORM v0.3+: dùng object thay vì string array
      relations: { invoices: true },
    });
    if (!shift) throw new NotFoundException(`Không tìm thấy ca làm ID ${id}`);

    const end = shift.endTime ?? new Date();
    const durationMs = end.getTime() - shift.startTime.getTime();
    const hours = Math.floor(durationMs / 3_600_000);
    const minutes = Math.floor((durationMs % 3_600_000) / 60_000);

    return {
      shift,
      totalRevenue: Number(shift.totalRevenue),
      duration: `${hours} giờ ${minutes} phút`,
    };
  }
}
