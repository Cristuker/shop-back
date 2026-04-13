import { Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { StoreModule } from "src/store/store.module";
import { OfferController } from "./offer.controller";
import { OfferScheduler } from "./offer.scheduler";
import { OfferService } from "./offer.service";

@Module({
  imports: [ScheduleModule.forRoot(), StoreModule],
  controllers: [OfferController],
  providers: [OfferService, OfferScheduler],
  exports: [OfferService],
})
export class OfferModule {}
