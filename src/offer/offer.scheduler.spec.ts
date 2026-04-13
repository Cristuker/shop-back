import { Test, TestingModule } from "@nestjs/testing";
import { PrismaService } from "src/prisma.service";
import { OfferScheduler } from "./offer.scheduler";

describe("OfferScheduler", () => {
  let scheduler: OfferScheduler;
  let prisma: { offer: { updateMany: jest.Mock } };

  beforeEach(async () => {
    prisma = { offer: { updateMany: jest.fn() } };

    const module: TestingModule = await Test.createTestingModule({
      providers: [OfferScheduler, { provide: PrismaService, useValue: prisma }],
    }).compile();

    scheduler = module.get<OfferScheduler>(OfferScheduler);
  });

  it("should mark ACTIVE offers with expiresAt in the past as EXPIRED", async () => {
    prisma.offer.updateMany.mockResolvedValue({ count: 3 });

    await scheduler.expireOffers();

    expect(prisma.offer.updateMany).toHaveBeenCalledWith({
      where: {
        status: "ACTIVE",
        expiresAt: { lt: expect.any(Date) },
      },
      data: { status: "EXPIRED" },
    });
  });

  it("should do nothing when no offers have expired", async () => {
    prisma.offer.updateMany.mockResolvedValue({ count: 0 });

    await scheduler.expireOffers();

    expect(prisma.offer.updateMany).toHaveBeenCalledTimes(1);
  });
});
