import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { OrderItem } from '../../orders/entities/order-item.entity.js';

// Danh mục món
export type MenuCategory = 'FOOD' | 'DRINK' | 'OTHER';

@Entity('menu_items') // bảng thực đơn (món ăn, nước uống, ...)
export class MenuItem {
  @PrimaryGeneratedColumn()
  id!: number;

  // Tên món
  @Column({ type: 'varchar', length: 150 })
  name!: string;

  // Danh mục: FOOD = đồ ăn, DRINK = nước uống, OTHER = khác
  @Column({
    type: 'enum',
    enum: ['FOOD', 'DRINK', 'OTHER'],
    default: 'OTHER',
  })
  category!: MenuCategory;

  // Đơn giá (VNĐ)
  @Column({ type: 'decimal', precision: 12, scale: 0, default: 0 })
  price!: number;

  // Mô tả món (không bắt buộc)
  @Column({ type: 'text', nullable: true, default: null })
  description!: string | null;

  // Còn bán hay không (soft-disable thay vì xóa)
  @Column({ type: 'tinyint', default: 1 })
  isAvailable!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // Quan hệ 1-nhiều với OrderItem
  @OneToMany('OrderItem', 'menuItem')
  orderItems!: OrderItem[];
}
