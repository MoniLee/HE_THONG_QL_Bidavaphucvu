import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

// Ghi chú: KHÔNG import Order/Invoice trực tiếp — các entity này import ngược lại
// BilliardTable tạo circular dependency trong ESM.
// Dùng string tên entity trong @OneToMany để TypeORM tự resolve sau khi load xong.
import type { Order } from '../../orders/entities/order.entity.js';
import type { Invoice } from '../../invoices/entities/invoice.entity.js';

// Trạng thái bàn bi-da
export type TableStatus = 'AVAILABLE' | 'OCCUPIED' | 'RESERVED' | 'MAINTENANCE';

@Entity('billiard_tables')
export class BilliardTable {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 100, unique: true })
  name!: string;

  // Giá chơi theo giờ (VNĐ)
  @Column({ type: 'decimal', precision: 12, scale: 0, default: 0 })
  price!: number;

  // Trạng thái hiện tại
  @Column({
    type: 'enum',
    enum: ['AVAILABLE', 'OCCUPIED', 'RESERVED', 'MAINTENANCE'],
    default: 'AVAILABLE',
  })
  status!: TableStatus;

  // Đang trong phiên chơi hay không
  @Column({ type: 'tinyint', default: 0 })
  isActive!: boolean;

  // Thời điểm bắt đầu phiên chơi hiện tại
  @Column({ type: 'datetime', nullable: true, default: null })
  startTime!: Date | null;

  // Thời điểm kết thúc phiên gần nhất
  @Column({ type: 'datetime', nullable: true, default: null })
  endTime!: Date | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // Dùng string 'Order'/'Invoice' thay vì () => Class để phá circular ESM
  @OneToMany('Order', 'table')
  orders!: Order[];

  @OneToMany('Invoice', 'table')
  invoices!: Invoice[];
}
