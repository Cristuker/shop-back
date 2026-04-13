import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { JwtPayload } from "src/auth/guards/jwt-auth.guard";
import { PrismaService } from "src/prisma.service";
import { CreateOfferDto } from "./dto/create-offer.dto";
import { ListOfferDto } from "./dto/list-offer.dto";
import { UpdateOfferDto } from "./dto/update-offer.dto";

@Injectable()
export class OfferService {
  constructor(private readonly prisma: PrismaService) {}

  async findActive(query: ListOfferDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;
    const status = (query.status ?? "ACTIVE") as
      | "ACTIVE"
      | "EXPIRED"
      | "CLOSED";

    const [data, total] = await Promise.all([
      this.prisma.offer.findMany({ where: { status }, skip, take: limit }),
      this.prisma.offer.count({ where: { status } }),
    ]);

    return { data, total, page, limit };
  }

  async create(dto: CreateOfferDto, user: JwtPayload) {
    if (user.type !== "SELLER") {
      throw new ForbiddenException("Only sellers can create offers");
    }

    const store = await this.prisma.store.findUnique({
      where: { userId: user.sub },
    });

    if (!store) {
      throw new NotFoundException("Store not found for this seller");
    }

    return this.prisma.offer.create({
      data: {
        name: dto.name.trim(),
        description: dto.description.trim(),
        value: dto.value,
        discount: dto.discount,
        stock: dto.stock,
        expiresAt: new Date(dto.expiresAt),
        storeId: store.id,
      },
    });
  }

  async update(id: number, dto: UpdateOfferDto, user: JwtPayload) {
    if (user.type !== "SELLER") {
      throw new ForbiddenException("Only sellers can update offers");
    }

    const offer = await this.prisma.offer.findUnique({
      where: { id },
      include: { store: true },
    });

    if (!offer) {
      throw new NotFoundException("Offer not found");
    }

    if (offer.store.userId !== user.sub) {
      throw new ForbiddenException(
        "You can only update offers from your own store",
      );
    }

    return this.prisma.offer.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name.trim() }),
        ...(dto.description !== undefined && {
          description: dto.description.trim(),
        }),
        ...(dto.value !== undefined && { value: dto.value }),
        ...(dto.discount !== undefined && { discount: dto.discount }),
        ...(dto.stock !== undefined && { stock: dto.stock }),
        ...(dto.expiresAt !== undefined && {
          expiresAt: new Date(dto.expiresAt),
        }),
      },
    });
  }

  async close(id: number, user: JwtPayload) {
    if (user.type !== "SELLER") {
      throw new ForbiddenException("Only sellers can close offers");
    }

    const offer = await this.prisma.offer.findUnique({
      where: { id },
      include: { store: true },
    });

    if (!offer) {
      throw new NotFoundException("Offer not found");
    }

    if (offer.store.userId !== user.sub) {
      throw new ForbiddenException(
        "You can only close offers from your own store",
      );
    }

    return this.prisma.offer.update({
      where: { id },
      data: { status: "CLOSED" },
    });
  }
}
