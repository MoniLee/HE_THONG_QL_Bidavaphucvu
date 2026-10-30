import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

// DTO mở ca làm mới
export class CreateShiftDto {
  // Tên ca (ví dụ: "Ca sáng 01/11/2026")
  @IsString()
  @IsNotEmpty({ message: 'Tên ca không được để trống' })
  name!: string;

  // Tên nhân viên trực ca
  @IsString()
  @IsNotEmpty({ message: 'Tên nhân viên không được để trống' })
  staffName!: string;

  // Ghi chú ca làm (tùy chọn)
  @IsOptional()
  @IsString()
  note?: string;
}
