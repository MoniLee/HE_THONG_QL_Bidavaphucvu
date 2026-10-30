import { IsOptional, IsString } from 'class-validator';

// DTO đóng ca làm (chỉ cho phép cập nhật ghi chú khi đóng)
export class CloseShiftDto {
  @IsOptional()
  @IsString()
  note?: string;
}
