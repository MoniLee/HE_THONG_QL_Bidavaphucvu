import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import type { Relation } from 'typeorm';
import { Order } from './order.entity.js';

const decimalNumberTransformer = {
  to: (value: number) => value,
  from: (value: string | number) => Number(value),
};

export enum PaymentMethod {
  COD = 'COD',
  BANKING = 'BANKING',
  CARD = 'CARD',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
}

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn()
  id: number;

  @OneToOne(() => Order)
  @JoinColumn({ name: 'orderId' })
  order: Relation<Order>;

  @Column({ type: 'int', unique: true })
  orderId: number;

  @Column({ type: 'enum', enum: PaymentMethod })
  method: PaymentMethod;

  @Column({ type: 'enum', enum: PaymentStatus, default: PaymentStatus.PENDING })
  status: PaymentStatus;

  @Column({
    type: 'decimal',
    precision: 15,
    scale: 2,
    transformer: decimalNumberTransformer,
  })
  amount: number;

  @Column({ type: 'varchar', length: 100, nullable: true })
  transactionCode: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
