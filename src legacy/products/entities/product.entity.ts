import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  DeleteDateColumn,
  JoinColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { Category } from './category.entity.js';
import { OrderItem } from '../../orders/entities/order-item.entity.js';

@Entity('products')
export class Product {

  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    type: 'varchar',
    length: 255
  })
  name: string;

  @Column({
    type: 'int'
  })
  price: number;

  @Column({
    type: 'text',
    nullable: true
  })
  description: string;

  @Column({ type: 'int' })
  categoryId: number;

  @ManyToOne(() => Category, category => category.products, {
    onDelete: 'RESTRICT',
  })

  @JoinColumn({ name: 'categoryId' })
  category: Category;

  @Column({ type: 'int', default: 0 })
  quantity: number;

  @CreateDateColumn()
  createdAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;

  @OneToMany(() => OrderItem, (item) => item.product)
  orderItems: OrderItem[];
}