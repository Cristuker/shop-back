import { IsNotEmpty, IsOptional, IsString, Matches } from "class-validator";

export class UpdateStoreDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: "Name cannot be empty" })
  name?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: "Description cannot be empty" })
  description?: string;

  @IsOptional()
  @Matches(/^(?:\+55)?[1-9][0-9][0-9]{7,9}$/, {
    message: "Phone must be a valid Brazilian phone number",
  })
  phone?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: "Address cannot be empty" })
  address?: string;
}
