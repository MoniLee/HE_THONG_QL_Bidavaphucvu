import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  ManyToOne,
  JoinColumn,
  CreateDateColumn
} from 'typeorm';
import type { Relation } from 'typeorm';
import { User } from '../../users/entities/user.entity.js';
import { OrderItem } from './order-item.entity.js';

const decimalNumberTransformer = {
  to: (value: number) => value,
  from: (value: string | number) => Number(value),
};

export enum OrderStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED',
  COMPLETED = 'COMPLETED'
}

@Entity('orders')
export class Order {

  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 100 })
  customerName: string;

  @Column({ type: 'varchar', length: 20 })
  customerPhone: string;

  @Column({ type: 'text' })
  shippingAddress: string;

  @Column({
    type: 'enum',
    enum: OrderStatus,
    default: OrderStatus.PENDING
  })
  status: OrderStatus;

  @Column({
    type: 'decimal',
    precision: 15,
    scale: 2,
    transformer: decimalNumberTransformer,
  })
  totalAmount: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0, transformer: decimalNumberTransformer })
  subtotal: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0, transformer: decimalNumberTransformer })
  discountAmount: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0, transformer: decimalNumberTransformer })
  shippingFee: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0, transformer: decimalNumberTransformer })
  grandTotal: number;

  @Column({ type: 'varchar', length: 50, nullable: true })
  couponCode: string | null;

  @Column({ type: 'int', nullable: true })
  userId: number | null;

  @ManyToOne(() => User, (user) => user.orders, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'userId' })
  user: Relation<User> | null;

  @Column({ type: 'text', nullable: true })
  shippingAddressSnapshot: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @OneToMany(() => OrderItem, item => item.order, {
    cascade: true
  })
  items: OrderItem[];
}