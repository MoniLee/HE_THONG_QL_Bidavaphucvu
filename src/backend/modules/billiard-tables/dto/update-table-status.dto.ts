import { IsIn } from 'class-validator';
import type { TableStatus } from '../entities/billiard-table.entity.js';

// Chỉ cho phép đặt thủ công 3 trạng thái này.
// OCCUPIED không được đặt tay — phải dùng API startGame.
const ALLOWED_STATUSES = ['AVAILABLE', 'RESERVED', 'MAINTENANCE'] as const;

export class UpdateTableStatusDto {
  @IsIn(ALLOWED_STATUSES, {
    message: `Trạng thái không hợp lệ. Giá trị cho phép: ${ALLOWED_STATUSES.join(', ')}`,
  })
  status!: TableStatus;
}
