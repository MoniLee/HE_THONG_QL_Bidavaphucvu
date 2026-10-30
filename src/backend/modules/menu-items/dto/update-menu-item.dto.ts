import { IsBoolean, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
// Dùng import type để tránh lỗi isolatedModules + emitDecoratorMetadata
import type { MenuCategory } from '../entities/menu-item.entity.js';

// DTO cập nhật món (tất cả trường đều tùy chọn)
export class UpdateMenuItemDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'Tên món không được để trống' })
  name?: string;

  @IsOptional()
  @IsEnum(['FOOD', 'DRINK', 'OTHER'], {
    message: 'Danh mục phải là FOOD, DRINK hoặc OTHER',
  })
  category?: MenuCategory;

  @IsOptional()
  @IsNumber({}, { message: 'Giá phải là số hữu hạn' })
  @Min(0, { message: 'Giá phải lớn hơn hoặc bằng 0' })
  price?: number;

  @IsOptional()
  @IsString()
  description?: string;

  // Bật/tắt trạng thái bán
  @IsOptional()
  @IsBoolean({ message: 'isAvailable phải là true hoặc false' })
  isAvailable?: boolean;
}
