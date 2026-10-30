import { IsBoolean, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateAddressDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  receiverName: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  receiverPhone: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  addressLine: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  ward: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  district: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  province: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
