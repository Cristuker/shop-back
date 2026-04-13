import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { PrismaService } from "src/prisma.service";

@Injectable()
export class OfferScheduler {
  private readonly logger = new Logger(OfferScheduler.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async expireOffers() {
    const { count } = await this.prisma.offer.updateMany({
      where: {
        status: "ACTIVE",
        expiresAt: { lt: new Date() },
      },
      data: { status: "EXPIRED" },
    });

    if (count > 0) {
      this.logger.log(`Expired ${count} offer(s)`);
    }
  }
}
