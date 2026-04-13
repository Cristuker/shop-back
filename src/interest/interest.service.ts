/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return */
import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { JwtPayload } from "src/auth/guards/jwt-auth.guard";
import { OfferService } from "src/offer/offer.service";
import { PrismaService } from "src/prisma.service";

@Injectable()
export class InterestService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly offerService: OfferService,
  ) {}

  async register(offerId: number, user: JwtPayload) {
    if (user.type !== "BUYER") {
      throw new ForbiddenException(
        "Only buyers can register interest in offers",
      );
    }

    const offer = await this.offerService.findById(offerId);

    if (!offer) {
      throw new NotFoundException("Offer not found");
    }

    if (offer.status !== "ACTIVE") {
      throw new ConflictException("Offer is not active");
    }

    if (offer.stock <= 0) {
      throw new ConflictException("Offer is out of stock");
    }

    const existing = await this.prisma.interest.findUnique({
      where: { userId_offerId: { userId: user.sub, offerId } },
    });

    if (existing) {
      throw new ConflictException(
        "You have already registered interest in this offer",
      );
    }

    const [interest] = await this.prisma.$transaction([
      this.prisma.interest.create({ data: { userId: user.sub, offerId } }),
      this.offerService.decrementStock(offerId),
    ]);

    return interest;
  }
}
