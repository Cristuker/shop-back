import { Injectable } from "@nestjs/common";
import { PrismaService } from "src/prisma.service";
import { CreateOfferDto } from "./dto/create-offer.dto";
import { OfferStatus } from "src/enums";

@Injectable()
export class OfferService {
  constructor(private readonly prisma: PrismaService) {}

  async create(offer: CreateOfferDto) {
    await this.prisma.offer.create({
      data: {
        description: offer.description,
        discount: offer.discount,
        expiresAt: offer.expiresAt,
        name: offer.name,
        value: offer.value,
        stock: offer.stock,
        status: offer.status as OfferStatus,
        storeId: offer.storeId,
      },
    });
  }
}
