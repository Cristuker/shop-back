/* eslint-disable @typescript-eslint/no-unsafe-return */
import { Transform } from "class-transformer";
import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MinLength,
} from "class-validator";

export class CreateUserDto {
  @IsString()
  @IsNotEmpty({ message: "Name is required" })
  name!: string;

  @IsEmail({}, { message: "A valid email is required" })
  email!: string;

  @IsString()
  @MinLength(6, {
    message: "Password is required and must contain at least 6 characters",
  })
  password!: string;

  @Transform(({ value }) =>
    typeof value === "string" ? value.trim().toUpperCase() : value,
  )
  @IsIn(["SELLER", "BUYER"], { message: "Type must be either seller or buyer" })
  type!: string;

  @IsOptional()
  @Matches(/^(?:\+55)?[1-9][0-9][0-9]{7,9}$/, {
    message: "If provided, phone must be a valid Brazilian phone number",
  })
  phone?: string;
}
