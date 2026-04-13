import { Module } from "@nestjs/common";
import { OfferModule } from "src/offer/offer.module";
import { InterestController } from "./interest.controller";
import { InterestService } from "./interest.service";

@Module({
  imports: [OfferModule],
  controllers: [InterestController],
  providers: [InterestService],
})
export class InterestModule {}
