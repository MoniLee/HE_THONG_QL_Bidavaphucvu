import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

// Ghi chú circular dependency ESM:
// Order → BilliardTable → Order (vòng tròn)
// Order → Invoice → Order (vòng tròn)
// Order → OrderItem → Order (vòng tròn)
// Giải pháp: dùng string tên entity trong tất cả decorator relation,
// chỉ giữ "import type" để TypeScript biết kiểu dữ liệu.
import type { BilliardTable } from '../../billiard-tables/entities/billiard-table.entity.js';
import type { OrderItem } from './order-item.entity.js';
import type { Invoice } from '../../invoices/entities/invoice.entity.js';

// Trạng thái đơn hàng
export type OrderStatus = 'OPEN' | 'BILLED' | 'CANCELLED';

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn()
  id!: number;

  // Khóa ngoại → bàn bi-da (dùng string 'BilliardTable' thay vì class)
  @ManyToOne('BilliardTable', 'orders', {
    onDelete: 'RESTRICT',
    nullable: false,
  })
  @JoinColumn({ name: 'table_id' })
  table!: BilliardTable;

  // Thời gian bắt đầu phiên chơi
  @Column({ type: 'datetime' })
  startTime!: Date;

  // Thời gian kết thúc phiên chơi (null nếu đang chơi)
  @Column({ type: 'datetime', nullable: true, default: null })
  endTime!: Date | null;

  // Số giờ chơi (tính khi kết thúc)
  @Column({ type: 'decimal', precision: 8, scale: 4, default: 0 })
  durationHours!: number;

  // Tiền bàn (giờ × giá/giờ)
  @Column({ type: 'decimal', precision: 12, scale: 0, default: 0 })
  tableAmount!: number;

  // Tiền món ăn/nước uống
  @Column({ type: 'decimal', precision: 12, scale: 0, default: 0 })
  itemsAmount!: number;

  // Tổng tiền (tableAmount + itemsAmount)
  @Column({ type: 'decimal', precision: 12, scale: 0, default: 0 })
  totalAmount!: number;

  // Trạng thái: OPEN = đang chơi, BILLED = đã thanh toán, CANCELLED = hủy
  @Column({
    type: 'enum',
    enum: ['OPEN', 'BILLED', 'CANCELLED'],
    default: 'OPEN',
  })
  status!: OrderStatus;

  @Column({ type: 'text', nullable: true, default: null })
  note!: string | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // Quan hệ 1-nhiều với OrderItem (dùng string)
  @OneToMany('OrderItem', 'order', { cascade: true })
  items!: OrderItem[];

  // Quan hệ 1-1 với Invoice (dùng string)
  @OneToOne('Invoice', 'order')
  invoice!: Invoice;
}
