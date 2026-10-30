import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsPositive,
  Max,
  Min,
  MinLength
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateProductDto {

  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  name: string;

  @IsInt()
  @IsPositive()
  price: number;

  @IsOptional()
  @IsString()
  description?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  categoryId: number;

  @IsInt()
  @Min(0)
  @Max(2147483647)
  quantity: number;
}