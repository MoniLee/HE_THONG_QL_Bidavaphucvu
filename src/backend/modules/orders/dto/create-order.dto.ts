import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

// DTO cho từng dòng món trong order
export class OrderItemDto {
  // ID món trong thực đơn
  @IsInt({ message: 'menuItemId phải là số nguyên' })
  @IsPositive({ message: 'menuItemId phải > 0' })
  menuItemId!: number;

  // Số lượng gọi
  @IsInt({ message: 'Số lượng phải là số nguyên' })
  @Min(1, { message: 'Số lượng phải >= 1' })
  quantity!: number;

  // Ghi chú riêng cho món (tùy chọn)
  @IsOptional()
  @IsString()
  note?: string;
}

// DTO tạo đơn hàng mới (bắt đầu phiên chơi bàn)
export class CreateOrderDto {
  // ID bàn bi-da
  @IsInt({ message: 'tableId phải là số nguyên' })
  @IsPositive({ message: 'tableId phải > 0' })
  tableId!: number;

  // Ghi chú cho cả order (tùy chọn)
  @IsOptional()
  @IsString()
  note?: string;
}

// DTO thêm món vào order đang mở
export class AddItemsToOrderDto {
  @IsArray({ message: 'items phải là mảng' })
  @ArrayMinSize(1, { message: 'Cần ít nhất 1 món' })
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items!: OrderItemDto[];
}
