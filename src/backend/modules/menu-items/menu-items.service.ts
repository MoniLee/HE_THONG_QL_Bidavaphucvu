import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MenuItem } from './entities/menu-item.entity.js';
import { CreateMenuItemDto } from './dto/create-menu-item.dto.js';
import { UpdateMenuItemDto } from './dto/update-menu-item.dto.js';

@Injectable()
export class MenuItemsService {
  constructor(
    // Inject repository để thao tác bảng menu_items
    @InjectRepository(MenuItem)
    private readonly menuRepo: Repository<MenuItem>,
  ) {}

  // ─── Helper: tìm món theo ID, ném 404 nếu không có ─────────────────────────
  private async getItemOrThrow(id: number): Promise<MenuItem> {
    const item = await this.menuRepo.findOne({ where: { id } });
    if (!item) throw new NotFoundException(`Không tìm thấy món với ID ${id}`);
    return item;
  }

  // ─── Lấy tất cả món (lọc theo available nếu cần) ────────────────────────────
  async findAll(onlyAvailable = false): Promise<MenuItem[]> {
    const where = onlyAvailable ? { isAvailable: true } : {};
    return this.menuRepo.find({ where, order: { category: 'ASC', name: 'ASC' } });
  }

  // ─── Lấy chi tiết một món ───────────────────────────────────────────────────
  async findOne(id: number): Promise<MenuItem> {
    return this.getItemOrThrow(id);
  }

  // ─── Tạo món mới ────────────────────────────────────────────────────────────
  async create(dto: CreateMenuItemDto): Promise<MenuItem> {
    const name = dto.name.trim();
    if (!name) throw new BadRequestException('Tên món không được để trống');

    // Kiểm tra tên trùng trong cùng danh mục
    const existing = await this.menuRepo
      .createQueryBuilder('m')
      .where('LOWER(m.name) = LOWER(:name) AND m.category = :category', {
        name,
        category: dto.category,
      })
      .getOne();
    if (existing) {
      throw new ConflictException(`Đã có món "${name}" trong danh mục ${dto.category}`);
    }

    const item = this.menuRepo.create({
      name,
      category: dto.category,
      price: dto.price,
      description: dto.description ?? null,
      isAvailable: true,
    });
    return this.menuRepo.save(item);
  }

  // ─── Cập nhật món ───────────────────────────────────────────────────────────
  async update(id: number, dto: UpdateMenuItemDto): Promise<MenuItem> {
    const item = await this.getItemOrThrow(id);

    if (dto.name !== undefined) {
      const name = dto.name.trim();
      if (!name) throw new BadRequestException('Tên món không được để trống');

      // Kiểm tra trùng tên trong cùng danh mục (bỏ qua bản ghi hiện tại)
      const category = dto.category ?? item.category;
      const existing = await this.menuRepo
        .createQueryBuilder('m')
        .where('LOWER(m.name) = LOWER(:name) AND m.category = :category AND m.id != :id', {
          name,
          category,
          id,
        })
        .getOne();
      if (existing) {
        throw new ConflictException(`Đã có món "${name}" trong danh mục ${category}`);
      }
      item.name = name;
    }

    if (dto.category !== undefined) item.category = dto.category;
    if (dto.price !== undefined) item.price = dto.price;
    if (dto.description !== undefined) item.description = dto.description;
    if (dto.isAvailable !== undefined) item.isAvailable = dto.isAvailable;

    return this.menuRepo.save(item);
  }

  // ─── Xóa món ────────────────────────────────────────────────────────────────
  async remove(id: number): Promise<{ message: string }> {
    const item = await this.getItemOrThrow(id);
    await this.menuRepo.remove(item);
    return { message: `Đã xóa món ID ${id}` };
  }
}
