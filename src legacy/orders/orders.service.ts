import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'node:crypto';
import {
  DataSource,
  FindOptionsOrder,
  QueryFailedError,
  Repository,
} from 'typeorm';
import { Coupon, DiscountType } from '../coupons/entities/coupon.entity.js';
import { Address } from '../addresses/entities/address.entity.js';
import { UserRole } from '../users/entities/user.entity.js';
import { AuditLog } from '../audit-logs/entities/audit-log.entity.js';
import { Product } from '../products/entities/product.entity.js';
import { CreateOrderDto } from './dto/create-order.dto.js';
import { CreatePaymentDto } from './dto/create-payment.dto.js';
import { FindOrdersQueryDto } from './dto/find-orders-query.dto.js';
import { IdempotencyKey } from './entities/idempotency-key.entity.js';
import { Order, OrderStatus } from './entities/order.entity.js';
import { OrderItem } from './entities/order-item.entity.js';
import { OrderStatusHistory } from './entities/order-status-history.entity.js';
import { Payment, PaymentStatus } from './entities/payment.entity.js';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private readonly ordersRepository: Repository<Order>,
    private readonly dataSource: DataSource,
  ) {}

  async create(
    createOrderDto: CreateOrderDto,
    idempotencyKey?: string,
    userId?: number,
    ipAddress?: string,
  ): Promise<Order> {
    const key = idempotencyKey?.trim();
    if (!key) {
      throw new BadRequestException('Thiếu header Idempotency-Key');
    }
    if (key.length > 100) {
      throw new BadRequestException('Idempotency-Key tối đa 100 ký tự');
    }

    const quantitiesByProduct = new Map<number, number>();
    for (const item of createOrderDto.items) {
      quantitiesByProduct.set(
        item.productId,
        (quantitiesByProduct.get(item.productId) ?? 0) + item.quantity,
      );
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    try {
      await queryRunner.startTransaction();

      const existingKey = await queryRunner.manager.findOne(IdempotencyKey, {
        where: { key },
        lock: { mode: 'pessimistic_write' },
      });
      if (existingKey) {
        await queryRunner.rollbackTransaction();
        const existingOrder = await queryRunner.manager.findOneBy(Order, {
          id: existingKey.orderId,
        });
        if (!existingOrder || existingOrder.userId !== userId) {
          throw new ConflictException('Idempotency-Key đã được sử dụng');
        }
        return this.findOne(existingKey.orderId, userId, UserRole.CUSTOMER);
      }

      const address = await queryRunner.manager.findOneBy(Address, {
        id: createOrderDto.addressId,
        userId: userId ?? -1,
      });
      if (!address) {
        throw new NotFoundException('Không tìm thấy địa chỉ thuộc tài khoản này');
      }
      const shippingAddressSnapshot = [
        address.addressLine,
        address.ward,
        address.district,
        address.province,
      ].join(', ');

      const productsById = new Map<number, Product>();
      for (const productId of [...quantitiesByProduct.keys()].sort((a, b) => a - b)) {
        const product = await queryRunner.manager.findOne(Product, {
          where: { id: productId },
          withDeleted: true,
          lock: { mode: 'pessimistic_write' },
        });

        if (!product || product.deletedAt) {
          throw new NotFoundException(
            `Không tìm thấy sản phẩm đang hoạt động có ID ${productId}`,
          );
        }

        const requestedQuantity = quantitiesByProduct.get(productId)!;
        if (product.quantity < requestedQuantity) {
          throw new BadRequestException(
            `Sản phẩm ${product.name} không đủ tồn kho`,
          );
        }
        productsById.set(productId, product);
      }

      const pricedItems = [...quantitiesByProduct].map(([productId, quantity]) => {
        const product = productsById.get(productId)!;
        return {
          product,
          productId,
          quantity,
          unitPrice: product.price,
        };
      });
      const subtotal = this.roundMoney(
        pricedItems.reduce((total, item) => total + item.quantity * item.unitPrice, 0),
      );

      let coupon: Coupon | null = null;
      let discountAmount = 0;
      if (createOrderDto.couponCode) {
        coupon = await queryRunner.manager.findOne(Coupon, {
          where: { code: createOrderDto.couponCode.trim().toUpperCase() },
          lock: { mode: 'pessimistic_write' },
        });
        if (!coupon) {
          throw new NotFoundException('Không tìm thấy coupon');
        }

        const now = new Date();
        if (
          !coupon.isActive ||
          now < coupon.startAt ||
          now > coupon.endAt ||
          coupon.usedCount >= coupon.usageLimit
        ) {
          throw new BadRequestException('Coupon không còn hiệu lực hoặc đã hết lượt');
        }
        if (subtotal < coupon.minOrderValue) {
          throw new BadRequestException('Đơn hàng chưa đạt giá trị tối thiểu của coupon');
        }

        const customerUsage = await queryRunner.manager.count(Order, {
          where: {
            couponCode: coupon.code,
            customerPhone: address.receiverPhone,
          },
        });
        if (customerUsage > 0) {
          throw new BadRequestException('Số điện thoại đã sử dụng coupon này');
        }

        const rawDiscount = coupon.discountType === DiscountType.PERCENT
          ? subtotal * coupon.discountValue / 100
          : coupon.discountValue;
        discountAmount = this.roundMoney(Math.min(rawDiscount, subtotal));
      }

      const shippingFee = subtotal < 500_000 ? 30_000 : subtotal < 1_000_000 ? 15_000 : 0;
      const grandTotal = this.roundMoney(
        Math.max(0, subtotal - discountAmount + shippingFee),
      );

      const order = await queryRunner.manager.save(
        queryRunner.manager.create(Order, {
          customerName: address.receiverName,
          customerPhone: address.receiverPhone,
          shippingAddress: shippingAddressSnapshot,
          shippingAddressSnapshot,
          userId: userId ?? null,
          status: OrderStatus.PENDING,
          subtotal,
          discountAmount,
          shippingFee,
          grandTotal,
          totalAmount: grandTotal,
          couponCode: coupon?.code ?? null,
        }),
      );

      for (const [productId, quantity] of quantitiesByProduct) {
        const product = productsById.get(productId)!;
        product.quantity -= quantity;
        await queryRunner.manager.save(Product, product);
      }

      const items = pricedItems.map((item) =>
        queryRunner.manager.create(OrderItem, {
          ...item,
          order,
          orderId: order.id,
        }),
      );
      order.items = await queryRunner.manager.save(OrderItem, items);
      await queryRunner.manager.save(OrderStatusHistory, {
        orderId: order.id,
        fromStatus: 'NEW',
        toStatus: OrderStatus.PENDING,
        note: 'Order created',
      });
      if (coupon) {
        coupon.usedCount += 1;
        await queryRunner.manager.save(Coupon, coupon);
      }
      await queryRunner.manager.save(IdempotencyKey, {
        key,
        orderId: order.id,
      });
      await queryRunner.manager.save(AuditLog, {
        action: 'CREATE_ORDER',
        entity: 'Order',
        entityId: String(order.id),
        userId: userId ?? null,
        ipAddress: ipAddress ?? null,
        metadata: JSON.stringify({ grandTotal, couponCode: coupon?.code ?? null }),
      });

      await queryRunner.commitTransaction();
      return this.findOne(order.id, userId, UserRole.CUSTOMER);
    } catch (error) {
      if (queryRunner.isTransactionActive) {
        await queryRunner.rollbackTransaction();
      }
      const driverCode = error instanceof QueryFailedError
        ? (error.driverError as { code?: string }).code
        : undefined;
      if (driverCode === 'ER_DUP_ENTRY') {
        const existing = await this.dataSource
          .getRepository(IdempotencyKey)
          .findOneBy({ key });
        if (existing) {
          const existingOrder = await this.ordersRepository.findOneBy({
            id: existing.orderId,
          });
          if (!existingOrder || existingOrder.userId !== userId) {
            throw new ConflictException('Idempotency-Key đã được sử dụng');
          }
          return this.findOne(existing.orderId, userId, UserRole.CUSTOMER);
        }
      }
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async findAll(query: FindOrdersQueryDto) {
    const { page, limit, status, sort, order } = query;
    const where = status ? { status } : {};
    const sortOrder: FindOptionsOrder<Order> = { [sort]: order };
    const [data, total] = await this.ordersRepository.findAndCount({
      where,
      order: sortOrder,
      relations: { items: { product: { category: true } } },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findMine(userId: number, query: FindOrdersQueryDto) {
    const { page, limit, status, sort, order } = query;
    const where = status ? { userId, status } : { userId };
    const sortOrder: FindOptionsOrder<Order> = { [sort]: order };
    const [data, total] = await this.ordersRepository.findAndCount({
      where,
      order: sortOrder,
      relations: { items: { product: { category: true } } },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data, page, limit, total, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: number, userId?: number, role?: UserRole): Promise<Order> {
    const where = role === UserRole.CUSTOMER ? { id, userId } : { id };
    const order = await this.ordersRepository.findOne({
      where,
      relations: { items: { product: { category: true } } },
    });
    if (!order) {
      throw new NotFoundException(`Không tìm thấy đơn hàng có ID ${id}`);
    }
    return order;
  }

  async getHistory(id: number, userId: number, role: UserRole): Promise<OrderStatusHistory[]> {
    await this.findOne(id, userId, role);
    return this.dataSource.getRepository(OrderStatusHistory).find({
      where: { orderId: id },
      order: { id: 'ASC' },
    });
  }

  async createPayment(
    id: number,
    createPaymentDto: CreatePaymentDto,
    userId: number,
    role: UserRole,
    ipAddress?: string,
  ): Promise<Payment> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    try {
      await queryRunner.startTransaction();
      const order = await queryRunner.manager.findOne(Order, {
        where: role === UserRole.CUSTOMER ? { id, userId } : { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!order) {
        throw new NotFoundException(`Không tìm thấy đơn hàng có ID ${id}`);
      }
      if (order.status === OrderStatus.CANCELLED) {
        throw new BadRequestException('Không thể thanh toán đơn hàng đã hủy');
      }

      let payment = await queryRunner.manager.findOne(Payment, {
        where: { orderId: id },
        lock: { mode: 'pessimistic_write' },
      });
      if (payment?.status === PaymentStatus.PAID) {
        throw new BadRequestException('Đơn hàng đã được thanh toán');
      }
      if (payment?.status === PaymentStatus.REFUNDED) {
        throw new BadRequestException('Khoản thanh toán đã được hoàn tiền');
      }

      payment ??= queryRunner.manager.create(Payment, { order, orderId: id });
      payment.method = createPaymentDto.method;
      payment.status = PaymentStatus.PAID;
      payment.amount = order.grandTotal;
      payment.transactionCode = `PAY-${randomUUID()}`;
      payment = await queryRunner.manager.save(Payment, payment);

      if (order.status === OrderStatus.PENDING) {
        order.status = OrderStatus.CONFIRMED;
        await queryRunner.manager.save(Order, order);
        await queryRunner.manager.save(OrderStatusHistory, {
          orderId: id,
          fromStatus: OrderStatus.PENDING,
          toStatus: OrderStatus.CONFIRMED,
          note: 'Payment completed',
        });
      }

      await queryRunner.manager.save(AuditLog, {
        action: 'CREATE_PAYMENT',
        entity: 'Payment',
        entityId: String(payment.id),
        userId,
        ipAddress: ipAddress ?? null,
        metadata: JSON.stringify({ orderId: id, amount: payment.amount }),
      });

      await queryRunner.commitTransaction();
      return payment;
    } catch (error) {
      if (queryRunner.isTransactionActive) {
        await queryRunner.rollbackTransaction();
      }
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async getPayment(id: number, userId: number, role: UserRole): Promise<Payment> {
    await this.findOne(id, userId, role);
    const payment = await this.dataSource.getRepository(Payment).findOne({
      where: { orderId: id },
    });
    if (!payment) {
      throw new NotFoundException(`Không tìm thấy thanh toán cho đơn hàng ${id}`);
    }
    return payment;
  }

  async refund(id: number, userId: number, role: UserRole, ipAddress?: string): Promise<Order> {
    const order = await this.findOne(id, userId, role);
    const payment = await this.getPayment(id, userId, role);
    if (order.status !== OrderStatus.CONFIRMED || payment.status !== PaymentStatus.PAID) {
      throw new BadRequestException('Chỉ có thể hoàn tiền đơn đã xác nhận và thanh toán');
    }
    return this.cancel(id, userId, role, ipAddress);
  }

  async updateStatus(id: number, status: OrderStatus, userId: number, ipAddress?: string): Promise<Order> {
    if (status === OrderStatus.CANCELLED) {
      return this.cancel(id, userId, UserRole.ADMIN, ipAddress);
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    try {
      await queryRunner.startTransaction();
      const order = await queryRunner.manager.findOne(Order, {
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!order) {
        throw new NotFoundException(`Không tìm thấy đơn hàng có ID ${id}`);
      }

      const allowedTransitions: Record<OrderStatus, OrderStatus[]> = {
        [OrderStatus.PENDING]: [OrderStatus.CONFIRMED],
        [OrderStatus.CONFIRMED]: [OrderStatus.COMPLETED],
        [OrderStatus.CANCELLED]: [],
        [OrderStatus.COMPLETED]: [],
      };
      if (!allowedTransitions[order.status].includes(status)) {
        throw new BadRequestException(
          `Không thể chuyển trạng thái từ ${order.status} sang ${status}`,
        );
      }

      const fromStatus = order.status;
      order.status = status;
      await queryRunner.manager.save(Order, order);
      await queryRunner.manager.save(OrderStatusHistory, {
        orderId: id,
        fromStatus,
        toStatus: status,
        note: 'Order status updated',
      });
      await queryRunner.manager.save(AuditLog, {
        action: 'UPDATE_ORDER_STATUS',
        entity: 'Order',
        entityId: String(id),
        userId,
        ipAddress: ipAddress ?? null,
        metadata: JSON.stringify({ fromStatus, toStatus: status }),
      });
      await queryRunner.commitTransaction();
    } catch (error) {
      if (queryRunner.isTransactionActive) {
        await queryRunner.rollbackTransaction();
      }
      throw error;
    } finally {
      await queryRunner.release();
    }

    return this.findOne(id, userId, UserRole.ADMIN);
  }

  async cancel(id: number, userId: number, role: UserRole, ipAddress?: string): Promise<Order> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    try {
      await queryRunner.startTransaction();
      const order = await queryRunner.manager.findOne(Order, {
        where: role === UserRole.CUSTOMER ? { id, userId } : { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!order) {
        throw new NotFoundException(`Không tìm thấy đơn hàng có ID ${id}`);
      }
      if (
        order.status === OrderStatus.CANCELLED ||
        order.status === OrderStatus.COMPLETED
      ) {
        throw new BadRequestException(
          `Không thể hủy đơn hàng ở trạng thái ${order.status}`,
        );
      }
      if (role === UserRole.CUSTOMER && order.status !== OrderStatus.PENDING) {
        throw new BadRequestException('Chỉ có thể hủy đơn hàng đang chờ xử lý');
      }

      const items = await queryRunner.manager.find(OrderItem, {
        where: { orderId: id },
        order: { id: 'ASC' },
      });
      const payment = await queryRunner.manager.findOne(Payment, {
        where: { orderId: id },
        lock: { mode: 'pessimistic_write' },
      });
      for (const item of items) {
        const product = await queryRunner.manager.findOne(Product, {
          where: { id: item.productId },
          withDeleted: true,
          lock: { mode: 'pessimistic_write' },
        });
        if (!product) {
          throw new NotFoundException(
            `Không tìm thấy sản phẩm có ID ${item.productId} để hoàn kho`,
          );
        }
        product.quantity += item.quantity;
        await queryRunner.manager.save(Product, product);
      }

      if (payment?.status === PaymentStatus.PAID) {
        payment.status = PaymentStatus.REFUNDED;
        await queryRunner.manager.save(Payment, payment);
      }
      const fromStatus = order.status;
      order.status = OrderStatus.CANCELLED;
      await queryRunner.manager.save(Order, order);
      await queryRunner.manager.save(OrderStatusHistory, {
        orderId: id,
        fromStatus,
        toStatus: OrderStatus.CANCELLED,
        note: 'Order cancelled and inventory restored',
      });
      await queryRunner.manager.save(AuditLog, {
        action: payment?.status === PaymentStatus.REFUNDED ? 'REFUND_PAYMENT' : 'CANCEL_ORDER',
        entity: 'Order',
        entityId: String(id),
        userId,
        ipAddress: ipAddress ?? null,
      });
      await queryRunner.commitTransaction();
    } catch (error) {
      if (queryRunner.isTransactionActive) {
        await queryRunner.rollbackTransaction();
      }
      throw error;
    } finally {
      await queryRunner.release();
    }

    return this.findOne(id, userId, role);
  }

  async getRevenue() {
    const [totalOrders, completedOrders, revenueRow] = await Promise.all([
      this.ordersRepository.count(),
      this.ordersRepository.count({ where: { status: OrderStatus.COMPLETED } }),
      this.ordersRepository
        .createQueryBuilder('order')
        .select('COALESCE(SUM(order.grandTotal), 0)', 'revenue')
        .addSelect('COALESCE(SUM(order.discountAmount), 0)', 'totalDiscount')
        .where('order.status = :status', { status: OrderStatus.COMPLETED })
        .getRawOne<{ revenue: string | number; totalDiscount: string | number }>(),
    ]);

    return {
      totalOrders,
      completedOrders,
      revenue: Number(revenueRow?.revenue ?? 0),
      totalDiscount: Number(revenueRow?.totalDiscount ?? 0),
    };
  }

  async getRevenueStatistics(from?: string, to?: string) {
    const startAt = from ? new Date(from) : undefined;
    const endAt = to ? new Date(to) : undefined;
    if (startAt && endAt && startAt > endAt) {
      throw new BadRequestException('from phải sớm hơn hoặc bằng to');
    }
    if (endAt) {
      if (/^\d{4}-\d{2}-\d{2}$/.test(to!)) {
        endAt.setUTCDate(endAt.getUTCDate() + 1);
      } else {
        endAt.setTime(endAt.getTime() + 1);
      }
    }

    const ordersQuery = this.ordersRepository.createQueryBuilder('order');
    if (startAt) {
      ordersQuery.andWhere('order.createdAt >= :startAt', { startAt });
    }
    if (endAt) {
      ordersQuery.andWhere('order.createdAt < :endAt', { endAt });
    }
    const totalOrders = await ordersQuery.getCount();

    const paidQuery = this.dataSource
      .getRepository(Payment)
      .createQueryBuilder('payment')
      .innerJoin('payment.order', 'order')
      .where('payment.status = :status', { status: PaymentStatus.PAID });
    if (startAt) {
      paidQuery.andWhere('order.createdAt >= :startAt', { startAt });
    }
    if (endAt) {
      paidQuery.andWhere('order.createdAt < :endAt', { endAt });
    }
    const [paidOrders, totals] = await Promise.all([
      paidQuery.clone().select('COUNT(payment.id)', 'count').getRawOne<{ count: string }>(),
      paidQuery
        .select('COALESCE(SUM(payment.amount), 0)', 'revenue')
        .addSelect('COALESCE(SUM(order.discountAmount), 0)', 'totalDiscount')
        .getRawOne<{ revenue: string | number; totalDiscount: string | number }>(),
    ]);

    return {
      totalOrders,
      paidOrders: Number(paidOrders?.count ?? 0),
      revenue: Number(totals?.revenue ?? 0),
      totalDiscount: Number(totals?.totalDiscount ?? 0),
    };
  }

  async getTopProducts(limit: number) {
    const rows = await this.dataSource
      .getRepository(OrderItem)
      .createQueryBuilder('item')
      .innerJoin('item.order', 'order')
      .innerJoin('item.product', 'product')
      .select('product.id', 'productId')
      .addSelect('product.name', 'name')
      .addSelect('SUM(item.quantity)', 'totalQuantity')
      .where('order.status IN (:...statuses)', {
        statuses: [OrderStatus.CONFIRMED, OrderStatus.COMPLETED],
      })
      .groupBy('product.id')
      .addGroupBy('product.name')
      .orderBy('SUM(item.quantity)', 'DESC')
      .take(limit)
      .getRawMany<{
        productId: number;
        name: string;
        totalQuantity: string | number;
      }>();

    return rows.map((row) => ({
      productId: Number(row.productId),
      name: row.name,
      totalQuantity: Number(row.totalQuantity),
    }));
  }

  private roundMoney(amount: number): number {
    return Math.round((amount + Number.EPSILON) * 100) / 100;
  }
}
