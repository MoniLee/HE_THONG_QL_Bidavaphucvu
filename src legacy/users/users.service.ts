import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLogsService } from '../audit-logs/audit-logs.service.js';
import { User } from './entities/user.entity.js';
import { UpdateUserRoleDto } from './dto/update-user-role.dto.js';
import { UpdateUserStatusDto } from './dto/update-user-status.dto.js';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async findAll() {
    const users = await this.usersRepository.find({ order: { id: 'ASC' } });
    return users.map((user) => this.toPublicUser(user));
  }

  async findOne(id: number) {
    const user = await this.usersRepository.findOneBy({ id });
    if (!user) {
      throw new NotFoundException('Không tìm thấy tài khoản');
    }
    return this.toPublicUser(user);
  }

  async updateRole(id: number, dto: UpdateUserRoleDto, actorId: number) {
    const user = await this.usersRepository.findOneBy({ id });
    if (!user) {
      throw new NotFoundException('Không tìm thấy tài khoản');
    }
    user.role = dto.role;
    await this.usersRepository.save(user);
    await this.auditLogsService.record({
      action: 'UPDATE_USER_ROLE',
      entity: 'User',
      entityId: id,
      userId: actorId,
      metadata: { role: dto.role },
    });
    return this.toPublicUser(user);
  }

  async updateStatus(id: number, dto: UpdateUserStatusDto, actorId: number) {
    const user = await this.usersRepository.findOneBy({ id });
    if (!user) {
      throw new NotFoundException('Không tìm thấy tài khoản');
    }
    user.isActive = dto.isActive;
    await this.usersRepository.save(user);
    await this.auditLogsService.record({
      action: 'UPDATE_USER_STATUS',
      entity: 'User',
      entityId: id,
      userId: actorId,
      metadata: { isActive: dto.isActive },
    });
    return this.toPublicUser(user);
  }

  async remove(id: number, actorId: number): Promise<{ message: string }> {
    const user = await this.usersRepository.findOneBy({ id });
    if (!user) {
      throw new NotFoundException('Không tìm thấy tài khoản');
    }
    await this.usersRepository.remove(user);
    await this.auditLogsService.record({
      action: 'DELETE_USER',
      entity: 'User',
      entityId: id,
      userId: actorId,
    });
    return { message: 'Đã xóa tài khoản' };
  }

  private toPublicUser(user: User) {
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
