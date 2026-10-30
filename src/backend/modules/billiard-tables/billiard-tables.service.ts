import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { BilliardTable, TableStatus } from './entities/billiard-table.entity.js';
import { CreateBilliardTableDto } from './dto/create-billiard-table.dto.js';
import { UpdateBilliardTableDto } from './dto/update-billiard-table.dto.js';
import { UpdateTableStatusDto } from './dto/update-table-status.dto.js';

// Các trạng thái được phép chuyển thủ công (không bao gồm OCCUPIED)
const MANUAL_ALLOWED_STATUSES: TableStatus[] = ['AVAILABLE', 'RESERVED', 'MAINTENANCE'];

// Bảng chuyển trạng thái hợp lệ
const VALID_STATUS_TRANSITIONS: Record<TableStatus, TableStatus[]> = {
  AVAILABLE: ['RESERVED', 'MAINTENANCE'],
  RESERVED: ['AVAILABLE', 'MAINTENANCE'],
  MAINTENANCE: ['AVAILABLE'],
  OCCUPIED: [], // không được chuyển thủ công
};

@Injectable()
export class BilliardTablesService {
  constructor(
    // Inject repository để thao tác với bảng billiard_tables
    @InjectRepository(BilliardTable)
    private readonly tableRepo: Repository<BilliardTable>,
  ) {}

  // ─── Helper: tìm bàn theo ID, ném 404 nếu không tồn tại ────────────────────
  private async getTableOrThrow(id: number): Promise<BilliardTable> {
    const table = await this.tableRepo.findOne({ where: { id } });
    if (!table) {
      throw new NotFoundException(`Không tìm thấy bàn bi-da với ID ${id}`);
    }
    return table;
  }

  // ─── Helper: chuẩn hóa tên bàn ─────────────────────────────────────────────
  private normalizeName(name: string): string {
    return name.trim().replace(/\s+/g, ' ');
  }

  // ─── Lấy tất cả bàn ─────────────────────────────────────────────────────────
  async findAll(): Promise<BilliardTable[]> {
    return this.tableRepo.find({ order: { id: 'ASC' } });
  }

  // ─── Tìm bàn theo ID ────────────────────────────────────────────────────────
  async findOne(id: number): Promise<BilliardTable> {
    return this.getTableOrThrow(id);
  }

  // ─── Chỉ lấy bàn đang trong phiên chơi (isActive = true) ───────────────────
  async findActiveTables(): Promise<BilliardTable[]> {
    return this.tableRepo.find({ where: { isActive: true } });
  }

  // ─── Tạo bàn mới ────────────────────────────────────────────────────────────
  async create(dto: CreateBilliardTableDto): Promise<BilliardTable> {
    const name = this.normalizeName(dto.name);
    if (!name) {
      throw new BadRequestException('Tên bàn không được để trống');
    }

    // Kiểm tra tên trùng (không phân biệt hoa thường)
    const existing = await this.tableRepo
      .createQueryBuilder('t')
      .where('LOWER(t.name) = LOWER(:name)', { name })
      .getOne();
    if (existing) {
      throw new ConflictException(`Đã tồn tại bàn bi-da với tên "${name}"`);
    }

    const table = this.tableRepo.create({
      name,
      price: dto.price,
      status: 'AVAILABLE',
      isActive: false,
      startTime: null,
      endTime: null,
    });
    return this.tableRepo.save(table);
  }

  // ─── Cập nhật tên và/hoặc giá bàn ──────────────────────────────────────────
  async update(id: number, dto: UpdateBilliardTableDto): Promise<BilliardTable> {
    const table = await this.getTableOrThrow(id);

    if (dto.name !== undefined) {
      const name = this.normalizeName(dto.name);
      if (!name) throw new BadRequestException('Tên bàn không được để trống');

      // Kiểm tra tên trùng với bàn khác
      const existing = await this.tableRepo
        .createQueryBuilder('t')
        .where('LOWER(t.name) = LOWER(:name) AND t.id != :id', { name, id })
        .getOne();
      if (existing) {
        throw new ConflictException(`Đã tồn tại bàn bi-da với tên "${name}"`);
      }
      table.name = name;
    }

    if (dto.price !== undefined) {
      if (table.isActive) {
        throw new ConflictException('Không thể thay đổi giá khi bàn đang có phiên chơi');
      }
      table.price = dto.price;
    }

    return this.tableRepo.save(table);
  }

  // ─── Xóa bàn (không cho xóa khi đang chơi) ─────────────────────────────────
  async remove(id: number): Promise<{ message: string }> {
    const table = await this.getTableOrThrow(id);
    if (table.isActive) {
      throw new ConflictException('Không thể xóa bàn đang có phiên chơi hoạt động');
    }
    await this.tableRepo.remove(table);
    return { message: `Đã xóa bàn bi-da ID ${id}` };
  }

  // ─── Cập nhật trạng thái thủ công ───────────────────────────────────────────
  async updateStatus(id: number, dto: UpdateTableStatusDto): Promise<BilliardTable> {
    const table = await this.getTableOrThrow(id);
    const newStatus = dto.status;

    if (!MANUAL_ALLOWED_STATUSES.includes(newStatus)) {
      throw new BadRequestException(
        `Không thể đặt trạng thái ${newStatus} trực tiếp. OCCUPIED chỉ được đặt qua API bắt đầu phiên chơi.`,
      );
    }
    if (table.status === 'OCCUPIED') {
      throw new ConflictException(
        'Bàn đang được sử dụng. Hãy kết thúc phiên chơi trước.',
      );
    }
    const allowed = VALID_STATUS_TRANSITIONS[table.status];
    if (!allowed.includes(newStatus)) {
      throw new ConflictException(
        `Không thể chuyển từ ${table.status} sang ${newStatus}`,
      );
    }

    table.status = newStatus;
    return this.tableRepo.save(table);
  }

  // ─── Bắt đầu phiên chơi ─────────────────────────────────────────────────────
  async startGame(id: number): Promise<BilliardTable> {
    const table = await this.getTableOrThrow(id);

    if (table.status !== 'AVAILABLE') {
      throw new ConflictException(
        `Không thể bắt đầu chơi khi bàn đang ở trạng thái ${table.status}`,
      );
    }
    if (table.isActive) {
      throw new ConflictException('Bàn này đã có phiên chơi đang diễn ra');
    }

    table.status = 'OCCUPIED';
    table.isActive = true;
    table.startTime = new Date();
    table.endTime = null;
    return this.tableRepo.save(table);
  }

  // ─── Tính hóa đơn tạm (không kết thúc phiên) ────────────────────────────────
  async calculateBill(id: number): Promise<{
    tableId: number;
    tableName: string;
    startTime: Date;
    currentTime: Date;
    durationHours: number;
    pricePerHour: number;
    tableAmount: number;
  }> {
    const table = await this.getTableOrThrow(id);
    if (!table.isActive || !table.startTime) {
      throw new ConflictException('Bàn này không có phiên chơi đang hoạt động');
    }

    const now = new Date();
    const durationHours = (now.getTime() - table.startTime.getTime()) / 3_600_000;
    const tableAmount = Math.round(durationHours * Number(table.price));

    return {
      tableId: table.id,
      tableName: table.name,
      startTime: table.startTime,
      currentTime: now,
      durationHours,
      pricePerHour: Number(table.price),
      tableAmount,
    };
  }

  // ─── Kết thúc phiên chơi (cập nhật bàn, trả về dữ liệu để tạo order/invoice) ─
  async endGame(id: number): Promise<{
    table: BilliardTable;
    durationHours: number;
    tableAmount: number;
    startTime: Date;
    endTime: Date;
  }> {
    const table = await this.getTableOrThrow(id);
    if (!table.isActive || !table.startTime) {
      throw new ConflictException('Bàn này không có phiên chơi đang hoạt động');
    }

    const endTime = new Date();
    const durationHours = (endTime.getTime() - table.startTime.getTime()) / 3_600_000;
    const tableAmount = Math.round(durationHours * Number(table.price));
    const startTime = table.startTime;

    // Cập nhật trạng thái bàn về sẵn sàng
    table.status = 'AVAILABLE';
    table.isActive = false;
    table.endTime = endTime;
    table.startTime = null;
    const savedTable = await this.tableRepo.save(table);

    return { table: savedTable, durationHours, tableAmount, startTime, endTime };
  }
}
