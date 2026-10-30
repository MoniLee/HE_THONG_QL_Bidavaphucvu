import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

const decimalNumberTransformer = {
  to: (value: number) => value,
  from: (value: string | number) => Number(value),
};

export enum DiscountType {
  PERCENT = 'PERCENT',
  FIXED = 'FIXED',
}

@Entity('coupons')
export class Coupon {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 50, unique: true })
  code: string;

  @Column({ type: 'enum', enum: DiscountType })
  discountType: DiscountType;

  @Column({
    type: 'decimal',
    precision: 15,
    scale: 2,
    transformer: decimalNumberTransformer,
  })
  discountValue: number;

  @Column({
    type: 'decimal',
    precision: 15,
    scale: 2,
    default: 0,
    transformer: decimalNumberTransformer,
  })
  minOrderValue: number;

  @Column({ type: 'int', default: 0 })
  usageLimit: number;

  @Column({ type: 'int', default: 0 })
  usedCount: number;

  @Column({ type: 'timestamp' })
  startAt: Date;

  @Column({ type: 'timestamp' })
  endAt: Date;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;
}
