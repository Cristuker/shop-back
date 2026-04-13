import { Transform } from "class-transformer";
import { IsIn, IsInt, IsOptional, Min } from "class-validator";

export class ListOfferDto {
  @IsOptional()
  @IsIn(["ACTIVE", "EXPIRED", "CLOSED"], {
    message: "Status must be ACTIVE, EXPIRED or CLOSED",
  })
  status?: string = "ACTIVE";

  @IsOptional()
  @Transform(({ value }) => parseInt(value as string, 10))
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Transform(({ value }) => parseInt(value as string, 10))
  @IsInt()
  @Min(1)
  limit?: number = 10;
}
