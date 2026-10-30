import {
  Body,
  Controller,
  Delete,
  Get,
  Ip,
  Patch,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { UserRole } from '../users/entities/user.entity.js';
import { CreateProductDto } from './dto/create-product.dto.js';
import { FindProductsQueryDto } from './dto/find-products-query.dto.js';
import { StockDto } from './dto/stock.dto.js';
import { UpdateProductDto } from './dto/update-product.dto.js';
import { ProductsService } from './products.service.js';

@Controller('products')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  async getAllProducts(@Query() query: FindProductsQueryDto) {
    return this.productsService.findAll(query);
  }

  @Get(':id')
  async getProductById(@Param('id') id: string) {
    return this.productsService.findOne(Number(id));
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  async createProduct(@Body() createProductDto: CreateProductDto) {
    return this.productsService.create(createProductDto);
  }

  @Put(':id')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  async updateProduct(
    @Param('id') id: string,
    @Body() updateData: UpdateProductDto,
  ) {
    return this.productsService.update(Number(id), updateData);
  }

  @Patch(':id/restore')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  restoreProduct(@Param('id') id: string) {
    return this.productsService.restore(Number(id));
  }

  @Patch(':id/stock/in')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  stockIn(
    @Param('id') id: string,
    @Body() stockDto: StockDto,
  ) {
    return this.productsService.stockIn(Number(id), stockDto.quantity);
  }

  @Patch(':id/stock/out')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  stockOut(
    @Param('id') id: string,
    @Body() stockDto: StockDto,
  ) {
    return this.productsService.stockOut(Number(id), stockDto.quantity);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  async deleteProduct(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Ip() ipAddress: string,
  ) {
    await this.productsService.remove(Number(id), user.id, ipAddress);
    return { message: 'Đã xóa sản phẩm thành công' };
  }
}
