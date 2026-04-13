/* eslint-disable @typescript-eslint/no-unsafe-return */
import { Transform } from "class-transformer";
import { IsIn } from "class-validator";

export class CreateOfferDto {
  name!: string;
  description!: string;
  value!: number;
  discount!: number;
  stock!: number;
  expiresAt!: string;
  storeId!: number;
  @Transform(({ value }) =>
    typeof value === "string" ? value.trim().toUpperCase() : value,
  )
  @IsIn(["ACTIVE", "EXPIRED", "CLOSED"], {
    message: "Offer must be either active, expired or closed",
  })
  status!: string;
}
