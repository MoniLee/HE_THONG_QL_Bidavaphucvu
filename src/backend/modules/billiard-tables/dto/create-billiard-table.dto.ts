import { IsNotEmpty, IsNumber, IsString, Min } from 'class-validator';

// DTO tạo bàn bi-da mới
export class CreateBilliardTableDto {
  // Tên bàn, không được để trống
  @IsString()
  @IsNotEmpty({ message: 'Tên bàn không được để trống' })
  name!: string;

  // Giá chơi theo giờ (VNĐ), phải >= 0
  @IsNumber({}, { message: 'Giá phải là số hữu hạn' })
  @Min(0, { message: 'Giá phải lớn hơn hoặc bằng 0' })
  price!: number;
}
