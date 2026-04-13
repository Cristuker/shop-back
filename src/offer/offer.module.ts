import { Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { OfferController } from "./offer.controller";
import { OfferScheduler } from "./offer.scheduler";
import { OfferService } from "./offer.service";

@Module({
  imports: [ScheduleModule.forRoot()],
  controllers: [OfferController],
  providers: [OfferService, OfferScheduler],
})
export class OfferModule {}
