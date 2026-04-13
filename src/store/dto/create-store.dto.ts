import { IsNotEmpty, IsString, Matches } from "class-validator";

export class CreateStoreDto {
  @IsString()
  @IsNotEmpty({ message: "Name is required" })
  name!: string;

  @IsString()
  @IsNotEmpty({ message: "Description is required" })
  description!: string;

  @Matches(/^(?:\+55)?[1-9][0-9][0-9]{7,9}$/, {
    message: "Phone must be a valid Brazilian phone number",
  })
  phone!: string;

  @IsString()
  @IsNotEmpty({ message: "Address is required" })
  address!: string;
}
