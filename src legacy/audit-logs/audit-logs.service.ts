import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from './entities/audit-log.entity.js';

export interface CreateAuditLog {
  action: string;
  entity: string;
  entityId: string | number;
  userId?: number | null;
  ipAddress?: string | null;
  metadata?: Record<string, unknown> | string | null;
}

@Injectable()
export class AuditLogsService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogsRepository: Repository<AuditLog>,
  ) {}

  async record(entry: CreateAuditLog): Promise<void> {
    await this.auditLogsRepository.save(
      this.auditLogsRepository.create({
        ...entry,
        entityId: String(entry.entityId),
        metadata:
          typeof entry.metadata === 'string'
            ? entry.metadata
            : entry.metadata
              ? JSON.stringify(entry.metadata)
              : null,
        userId: entry.userId ?? null,
        ipAddress: entry.ipAddress ?? null,
      }),
    );
  }

  async findAll(filters: {
    userId?: number;
    action?: string;
    entity?: string;
    skip: number;
    take: number;
  }) {
    const query = this.auditLogsRepository.createQueryBuilder('audit');
    if (filters.userId !== undefined) {
      query.andWhere('audit.userId = :userId', { userId: filters.userId });
    }
    if (filters.action) {
      query.andWhere('audit.action = :action', { action: filters.action });
    }
    if (filters.entity) {
      query.andWhere('audit.entity = :entity', { entity: filters.entity });
    }
    const [data, total] = await query
      .orderBy('audit.createdAt', 'DESC')
      .skip(filters.skip)
      .take(filters.take)
      .getManyAndCount();
    return { data, total, skip: filters.skip, limit: filters.take };
  }
}
