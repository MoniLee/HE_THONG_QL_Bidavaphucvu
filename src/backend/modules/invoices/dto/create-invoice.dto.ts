import { IsEnum, IsInt, IsNumber, IsOptional, IsPositive, IsString, Min } from 'class-validator';
// Dùng import type để tránh lỗi isolatedModules + emitDecoratorMetadata
import type { PaymentMethod } from '../entities/invoice.entity.js';

// DTO tạo hóa đơn thanh toán
export class CreateInvoiceDto {
  // ID order đã đóng (status = BILLED)
  @IsInt({ message: 'orderId phải là số nguyên' })
  @IsPositive({ message: 'orderId phải > 0' })
  orderId!: number;

  // ID ca làm hiện tại (tùy chọn)
  @IsOptional()
  @IsInt({ message: 'shiftId phải là số nguyên' })
  @IsPositive()
  shiftId?: number;

  // Giảm giá (VNĐ, mặc định 0)
  @IsOptional()
  @IsNumber({}, { message: 'discount phải là số' })
  @Min(0, { message: 'discount phải >= 0' })
  discount?: number;

  // Phương thức thanh toán: CASH | TRANSFER | CARD
  @IsEnum(['CASH', 'TRANSFER', 'CARD'], {
    message: 'Phương thức thanh toán phải là CASH, TRANSFER hoặc CARD',
  })
  paymentMethod!: PaymentMethod;

  // Ghi chú hóa đơn (tùy chọn)
  @IsOptional()
  @IsString()
  note?: string;
}
