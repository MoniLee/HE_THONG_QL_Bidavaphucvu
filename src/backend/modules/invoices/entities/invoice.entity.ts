import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

// Ghi chú circular dependency ESM:
// Invoice → BilliardTable → Invoice (vòng tròn)
// Invoice → Order → Invoice (vòng tròn)
// Dùng string tên entity trong decorator, import type chỉ để TypeScript type check.
import type { BilliardTable } from '../../billiard-tables/entities/billiard-table.entity.js';
import type { Order } from '../../orders/entities/order.entity.js';
import { Shift } from '../../shifts/entities/shift.entity.js'; // Shift không circular → import bình thường

// Phương thức thanh toán
export type PaymentMethod = 'CASH' | 'TRANSFER' | 'CARD';

@Entity('invoices')
export class Invoice {
  @PrimaryGeneratedColumn()
  id!: number;

  // Khóa ngoại → bàn bi-da (dùng string để phá circular)
  @ManyToOne('BilliardTable', 'invoices', {
    onDelete: 'RESTRICT',
    nullable: false,
  })
  @JoinColumn({ name: 'table_id' })
  table!: BilliardTable;

  // Khóa ngoại → đơn hàng 1-1 (dùng string để phá circular)
  @OneToOne('Order', 'invoice', {
    onDelete: 'RESTRICT',
    nullable: false,
  })
  @JoinColumn({ name: 'order_id' })
  order!: Order;

  // Khóa ngoại → ca làm (Shift không circular → dùng () => bình thường)
  @ManyToOne(() => Shift, (shift) => shift.invoices, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({ name: 'shift_id' })
  shift!: Shift | null;

  // Thời gian in hóa đơn
  @Column({ type: 'datetime' })
  issuedAt!: Date;

  // Tiền bàn (giờ chơi)
  @Column({ type: 'decimal', precision: 12, scale: 0, default: 0 })
  tableAmount!: number;

  // Tiền món ăn/nước uống
  @Column({ type: 'decimal', precision: 12, scale: 0, default: 0 })
  itemsAmount!: number;

  // Tổng tiền trước giảm giá
  @Column({ type: 'decimal', precision: 12, scale: 0, default: 0 })
  subtotal!: number;

  // Giảm giá (VNĐ)
  @Column({ type: 'decimal', precision: 12, scale: 0, default: 0 })
  discount!: number;

  // Tổng tiền sau giảm giá
  @Column({ type: 'decimal', precision: 12, scale: 0, default: 0 })
  totalAmount!: number;

  // Phương thức thanh toán
  @Column({
    type: 'enum',
    enum: ['CASH', 'TRANSFER', 'CARD'],
    default: 'CASH',
  })
  paymentMethod!: PaymentMethod;

  @Column({ type: 'text', nullable: true, default: null })
  note!: string | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
