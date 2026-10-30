import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Address } from './entities/address.entity.js';
import { CreateAddressDto } from './dto/create-address.dto.js';
import { UpdateAddressDto } from './dto/update-address.dto.js';

@Injectable()
export class AddressesService {
  constructor(
    @InjectRepository(Address)
    private readonly addressesRepository: Repository<Address>,
    private readonly dataSource: DataSource,
  ) {}

  findAll(userId: number) {
    return this.addressesRepository.find({
      where: { userId },
      order: { isDefault: 'DESC', id: 'ASC' },
    });
  }

  async create(userId: number, dto: CreateAddressDto) {
    return this.dataSource.transaction(async (manager) => {
      if (dto.isDefault) {
        await manager.update(Address, { userId, isDefault: true }, { isDefault: false });
      }
      const address = manager.create(Address);
      Object.assign(address, {
        receiverName: dto.receiverName,
        receiverPhone: dto.receiverPhone,
        addressLine: dto.addressLine,
        ward: dto.ward,
        district: dto.district,
        province: dto.province,
        isDefault: dto.isDefault ?? false,
        userId,
      });
      return manager.save(Address, address);
    });
  }

  async update(userId: number, id: number, dto: UpdateAddressDto) {
    return this.dataSource.transaction(async (manager) => {
      const address = await manager.findOneBy(Address, { id, userId });
      if (!address) {
        throw new NotFoundException('Không tìm thấy địa chỉ');
      }
      if (dto.isDefault) {
        await manager.update(Address, { userId, isDefault: true }, { isDefault: false });
      }
      Object.assign(address, dto);
      return manager.save(Address, address);
    });
  }

  async setDefault(userId: number, id: number) {
    return this.dataSource.transaction(async (manager) => {
      const address = await manager.findOneBy(Address, { id, userId });
      if (!address) {
        throw new NotFoundException('Không tìm thấy địa chỉ');
      }
      await manager.update(Address, { userId, isDefault: true }, { isDefault: false });
      address.isDefault = true;
      return manager.save(Address, address);
    });
  }

  async remove(userId: number, id: number) {
    const result = await this.addressesRepository.delete({ id, userId });
    if (!result.affected) {
      throw new NotFoundException('Không tìm thấy địa chỉ');
    }
    return { message: 'Đã xóa địa chỉ' };
  }
}
