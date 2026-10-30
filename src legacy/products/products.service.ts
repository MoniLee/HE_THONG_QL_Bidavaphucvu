import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { AuditLogsService } from '../audit-logs/audit-logs.service.js';
import { Category } from './entities/category.entity.js';
import {
  Between,
  FindOptionsOrder,
  FindOptionsWhere,
  LessThanOrEqual,
  Like,
  MoreThanOrEqual,
  DataSource,
  Repository,
} from 'typeorm';
import { CreateProductDto } from './dto/create-product.dto.js';
import { FindProductsQueryDto } from './dto/find-products-query.dto.js';
import { UpdateProductDto } from './dto/update-product.dto.js';
import { Product } from './entities/product.entity.js';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,
    @InjectRepository(Category)
    private readonly categoriesRepository: Repository<Category>,
    private readonly dataSource: DataSource,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async findAll(query: FindProductsQueryDto) {
    const {
      name,
      categoryId,
      minPrice,
      maxPrice,
      page,
      limit,
      sort,
      order,
    } = query;

    if (
      minPrice !== undefined &&
      maxPrice !== undefined &&
      minPrice > maxPrice
    ) {
      throw new BadRequestException(
        'minPrice phải nhỏ hơn hoặc bằng maxPrice',
      );
    }

    const where: FindOptionsWhere<Product> = {};
    if (name?.trim()) {
      where.name = Like(`%${name.trim()}%`);
    }
    if (categoryId !== undefined) {
      where.categoryId = categoryId;
    }

    if (minPrice !== undefined && maxPrice !== undefined) {
      where.price = Between(minPrice, maxPrice);
    } else if (minPrice !== undefined) {
      where.price = MoreThanOrEqual(minPrice);
    } else if (maxPrice !== undefined) {
      where.price = LessThanOrEqual(maxPrice);
    }

    const sortOrder: FindOptionsOrder<Product> = {
      [sort]: order,
    };
    const [data, total] = await this.productsRepository.findAndCount({
      where,
      order: sortOrder,
      relations: { category: true },
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

  async findOne(id: number): Promise<Product> {
    const product = await this.productsRepository.findOne({
      where: { id },
      relations: { category: true },
    });

    if (!product) {
      throw new NotFoundException(
        `Không tìm thấy sản phẩm có ID ${id}`,
      );
    }

    return product;
  }

  async create(createProductDto: CreateProductDto): Promise<Product> {
    const category = await this.categoriesRepository.findOneBy({
      id: createProductDto.categoryId,
    });
    if (!category) {
      throw new NotFoundException(
        `Không tìm thấy category có ID ${createProductDto.categoryId}`,
      );
    }

    const newProduct = this.productsRepository.create({
      name: createProductDto.name,
      price: createProductDto.price,
      description: createProductDto.description,
      categoryId: createProductDto.categoryId,
      quantity: createProductDto.quantity,
      category,
    });
    return this.productsRepository.save(newProduct);
  }

  async update(id: number, updateData: UpdateProductDto): Promise<Product> {
    const product = await this.findOne(id);
    const { categoryId, ...productData } = updateData;
    if (categoryId !== undefined) {
      const category = await this.categoriesRepository.findOneBy({
        id: categoryId,
      });
      if (!category) {
        throw new NotFoundException(`Không tìm thấy category có ID ${categoryId}`);
      }
      product.category = category;
      product.categoryId = categoryId;
    }
    Object.assign(product, productData);
    return this.productsRepository.save(product);
  }

  async remove(id: number, userId: number, ipAddress?: string): Promise<void> {
    await this.findOne(id);
    await this.productsRepository.softDelete(id);
    await this.auditLogsService.record({
      action: 'DELETE_PRODUCT',
      entity: 'Product',
      entityId: id,
      userId,
      ipAddress,
    });
  }

  async restore(id: number): Promise<Product> {
    const product = await this.productsRepository.findOne({
      where: { id },
      withDeleted: true,
      relations: { category: true },
    });
    if (!product) {
      throw new NotFoundException(`Không tìm thấy sản phẩm có ID ${id}`);
    }
    if (!product.deletedAt) {
      throw new BadRequestException('Sản phẩm chưa bị xóa');
    }

    await this.productsRepository.restore(id);
    return this.findOne(id);
  }

  async stockIn(id: number, quantity: number): Promise<Product> {
    const product = await this.findOne(id);
    product.quantity += quantity;
    return this.productsRepository.save(product);
  }

  async stockOut(id: number, quantity: number): Promise<Product> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const product = await queryRunner.manager.findOne(Product, {
        where: { id },
        withDeleted: true,
        relations: { category: true },
        lock: { mode: 'pessimistic_write' },
      });

      if (!product || product.deletedAt) {
        throw new NotFoundException(
          `Không tìm thấy sản phẩm đang hoạt động có ID ${id}`,
        );
      }
      if (product.quantity < quantity) {
        throw new BadRequestException('Số lượng xuất vượt quá tồn kho');
      }

      product.quantity -= quantity;
      const updatedProduct = await queryRunner.manager.save(Product, product);
      await queryRunner.commitTransaction();
      return updatedProduct;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
