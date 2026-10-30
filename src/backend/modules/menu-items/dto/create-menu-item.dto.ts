import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
// Dùng import type để tránh lỗi isolatedModules + emitDecoratorMetadata
import type { MenuCategory } from '../entities/menu-item.entity.js';

// DTO tạo món ăn / nước uống mới
export class CreateMenuItemDto {
  // Tên món, không được để trống
  @IsString()
  @IsNotEmpty({ message: 'Tên món không được để trống' })
  name!: string;

  // Danh mục: FOOD | DRINK | OTHER
  @IsEnum(['FOOD', 'DRINK', 'OTHER'], {
    message: 'Danh mục phải là FOOD, DRINK hoặc OTHER',
  })
  category!: MenuCategory;

  // Đơn giá (VNĐ), phải >= 0
  @IsNumber({}, { message: 'Giá phải là số hữu hạn' })
  @Min(0, { message: 'Giá phải lớn hơn hoặc bằng 0' })
  price!: number;

  // Mô tả (tùy chọn)
  @IsOptional()
  @IsString()
  description?: string;
}
