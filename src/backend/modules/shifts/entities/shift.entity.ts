import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

// Shift → Invoice → Shift: circular dependency ESM
// Dùng string 'Invoice' trong @OneToMany, import type chỉ để TypeScript check
import type { Invoice } from '../../invoices/entities/invoice.entity.js';

// Trạng thái ca làm
export type ShiftStatus = 'OPEN' | 'CLOSED';

@Entity('shifts') // bảng ca làm việc
export class Shift {
  @PrimaryGeneratedColumn()
  id!: number;

  // Tên ca (ví dụ: "Ca sáng 01/11/2026")
  @Column({ type: 'varchar', length: 150 })
  name!: string;

  // Tên nhân viên trực ca
  @Column({ type: 'varchar', length: 150 })
  staffName!: string;

  // Thời gian bắt đầu ca
  @Column({ type: 'datetime' })
  startTime!: Date;

  // Thời gian kết thúc ca (null nếu ca chưa đóng)
  @Column({ type: 'datetime', nullable: true, default: null })
  endTime!: Date | null;

  // Trạng thái ca: OPEN = đang mở, CLOSED = đã đóng
  @Column({
    type: 'enum',
    enum: ['OPEN', 'CLOSED'],
    default: 'OPEN',
  })
  status!: ShiftStatus;

  // Tổng doanh thu ca (tính khi đóng ca)
  @Column({ type: 'decimal', precision: 15, scale: 0, default: 0 })
  totalRevenue!: number;

  // Ghi chú ca làm
  @Column({ type: 'text', nullable: true, default: null })
  note!: string | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // Quan hệ 1-nhiều: một ca có nhiều hóa đơn (dùng string để phá circular)
  @OneToMany('Invoice', 'shift')
  invoices!: Invoice[];
}
