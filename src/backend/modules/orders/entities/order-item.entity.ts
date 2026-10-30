import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import type { MenuItem } from '../../menu-items/entities/menu-item.entity.js';

// Ghi chú: KHÔNG import Order trực tiếp để tránh circular dependency ESM.
// order-item.entity ← import → order.entity tạo vòng tròn, Node ESM báo lỗi
// "Cannot access 'Order' before initialization".
// Giải pháp chuẩn của TypeORM: dùng tên entity dạng string trong @ManyToOne.
// TypeORM sẽ tự resolve class từ registry sau khi tất cả entity đã đăng ký.
import type { Order } from './order.entity.js'; // chỉ dùng cho TypeScript type check

@Entity('order_items') // bảng chi tiết món trong mỗi đơn hàng
export class OrderItem {
  @PrimaryGeneratedColumn()
  id!: number;

  // Dùng string 'Order' thay vì () => Order để phá circular dependency
  @ManyToOne('Order', 'items', {
    onDelete: 'CASCADE',
    nullable: false,
  })
  @JoinColumn({ name: 'order_id' })
  order!: Order;

  @ManyToOne('MenuItem', 'orderItems', {
    onDelete: 'RESTRICT',
    nullable: false,
  })
  @JoinColumn({ name: 'menu_item_id' })
  menuItem!: MenuItem;

  @Column({ type: 'int', default: 1 })
  quantity!: number;

  // Đơn giá tại thời điểm gọi (snapshot giá, không thay đổi khi menu đổi giá)
  @Column({ type: 'decimal', precision: 12, scale: 0, default: 0 })
  unitPrice!: number;

  // Thành tiền = quantity × unitPrice
  @Column({ type: 'decimal', precision: 12, scale: 0, default: 0 })
  subtotal!: number;

  // Ghi chú riêng cho món (vd: "ít đường", "không đá")
  @Column({ type: 'varchar', length: 255, nullable: true, default: null })
  note!: string | null;

  @CreateDateColumn()
  createdAt!: Date;
}
