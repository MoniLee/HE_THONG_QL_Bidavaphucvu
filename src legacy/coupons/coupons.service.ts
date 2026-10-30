import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLogsService } from '../audit-logs/audit-logs.service.js';
import { CreateCouponDto } from './dto/create-coupon.dto.js';
import { UpdateCouponDto } from './dto/update-coupon.dto.js';
import { Coupon, DiscountType } from './entities/coupon.entity.js';

@Injectable()
export class CouponsService {
  constructor(
    @InjectRepository(Coupon)
    private readonly couponsRepository: Repository<Coupon>,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async create(
    createCouponDto: CreateCouponDto,
    actorId: number,
    ipAddress?: string,
  ): Promise<Coupon> {
    if (createCouponDto.endAt <= createCouponDto.startAt) {
      throw new BadRequestException('endAt phải sau startAt');
    }
    if (
      createCouponDto.discountType === DiscountType.PERCENT &&
      createCouponDto.discountValue > 100
    ) {
      throw new BadRequestException('Coupon phần trăm không được vượt quá 100');
    }
    if (await this.couponsRepository.findOneBy({ code: createCouponDto.code })) {
      throw new ConflictException('Mã coupon đã tồn tại');
    }

    const coupon = await this.couponsRepository.save(
      this.couponsRepository.create(createCouponDto),
    );
    await this.auditLogsService.record({
      action: 'CREATE_COUPON',
      entity: 'Coupon',
      entityId: coupon.id,
      userId: actorId,
      ipAddress,
    });
    return coupon;
  }

  async update(
    id: number,
    dto: UpdateCouponDto,
    actorId: number,
    ipAddress?: string,
  ): Promise<Coupon> {
    const coupon = await this.couponsRepository.findOneBy({ id });
    if (!coupon) {
      throw new NotFoundException('Không tìm thấy coupon');
    }
    const nextCode = dto.code?.trim().toUpperCase();
    if (nextCode && nextCode !== coupon.code) {
      if (await this.couponsRepository.findOneBy({ code: nextCode })) {
        throw new ConflictException('Mã coupon đã tồn tại');
      }
      coupon.code = nextCode;
    }

    const updates = Object.fromEntries(
      Object.entries(dto).filter(([, value]) => value !== undefined),
    );
    Object.assign(coupon, updates, { code: nextCode ?? coupon.code });
    if (coupon.endAt <= coupon.startAt) {
      throw new BadRequestException('endAt phải sau startAt');
    }
    if (
      coupon.discountType === DiscountType.PERCENT &&
      coupon.discountValue > 100
    ) {
      throw new BadRequestException('Coupon phần trăm không được vượt quá 100');
    }
    await this.couponsRepository.save(coupon);
    await this.auditLogsService.record({
      action: 'UPDATE_COUPON',
      entity: 'Coupon',
      entityId: id,
      userId: actorId,
      ipAddress,
    });
    return coupon;
  }

  async setActive(id: number, isActive: boolean, actorId: number, ipAddress?: string) {
    const coupon = await this.couponsRepository.findOneBy({ id });
    if (!coupon) {
      throw new NotFoundException('Không tìm thấy coupon');
    }
    coupon.isActive = isActive;
    await this.couponsRepository.save(coupon);
    await this.auditLogsService.record({
      action: isActive ? 'ACTIVATE_COUPON' : 'DEACTIVATE_COUPON',
      entity: 'Coupon',
      entityId: id,
      userId: actorId,
      ipAddress,
    });
    return coupon;
  }

  async findAll(): Promise<Coupon[]> {
    return this.couponsRepository.find({ order: { id: 'DESC' } });
  }
}
