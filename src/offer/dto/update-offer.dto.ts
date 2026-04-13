import { Transform } from "class-transformer";
import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from "class-validator";

export class UpdateOfferDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: "Name cannot be empty" })
  name?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: "Description cannot be empty" })
  description?: string;

  @IsOptional()
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: "Value must be a valid number" },
  )
  @Min(0.01, { message: "Value must be greater than 0" })
  value?: number;

  @IsOptional()
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: "Discount must be a valid number" },
  )
  @Min(0, { message: "Discount must be at least 0" })
  @Max(100, { message: "Discount must be at most 100" })
  discount?: number;

  @IsOptional()
  @Transform(({ value }) => parseInt(value as string, 10))
  @IsInt({ message: "Stock must be an integer" })
  @Min(0, { message: "Stock must be at least 0" })
  stock?: number;

  @IsOptional()
  @IsDateString({}, { message: "ExpiresAt must be a valid ISO date string" })
  expiresAt?: string;
}
