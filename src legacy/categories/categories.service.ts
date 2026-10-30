import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from '../products/entities/product.entity.js';
import { Category } from '../products/entities/category.entity.js';
import { CreateCategoryDto } from './dto/create-category.dto.js';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private readonly categoriesRepository: Repository<Category>,
    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,
  ) {}

  async create(createCategoryDto: CreateCategoryDto): Promise<Category> {
    const category = this.categoriesRepository.create(createCategoryDto);
    return this.categoriesRepository.save(category);
  }

  async findAll(): Promise<Category[]> {
    return this.categoriesRepository.find({ order: { name: 'ASC' } });
  }

  async findProducts(id: number): Promise<Product[]> {
    const category = await this.categoriesRepository.findOneBy({ id });
    if (!category) {
      throw new NotFoundException(`Không tìm thấy category có ID ${id}`);
    }

    return this.productsRepository.find({
      where: { categoryId: id },
      relations: { category: true },
      order: { id: 'ASC' },
    });
  }

  async remove(id: number): Promise<void> {
    const category = await this.categoriesRepository.findOneBy({ id });
    if (!category) {
      throw new NotFoundException(`Không tìm thấy category có ID ${id}`);
    }

    const productCount = await this.productsRepository.count({
      where: { categoryId: id },
      withDeleted: true,
    });
    if (productCount > 0) {
      throw new ConflictException(
        'Không thể xóa category đang được sản phẩm sử dụng',
      );
    }

    await this.categoriesRepository.remove(category);
  }
}
