import { IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

// DTO cập nhật bàn bi-da (tất cả trường đều tùy chọn)
export class UpdateBilliardTableDto {
  // Tên mới (tùy chọn)
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'Tên bàn không được để trống' })
  name?: string;

  // Giá mới (tùy chọn, phải >= 0)
  @IsOptional()
  @IsNumber({}, { message: 'Giá phải là số hữu hạn' })
  @Min(0, { message: 'Giá phải lớn hơn hoặc bằng 0' })
  price?: number;
}
