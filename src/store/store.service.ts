import {
  ConflictException,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { JwtPayload } from "src/auth/guards/jwt-auth.guard";
import { PrismaService } from "../prisma.service";
import { CreateStoreDto } from "./dto/create-store.dto";

@Injectable()
export class StoreService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateStoreDto, user: JwtPayload) {
    if (user.type !== "SELLER") {
      throw new ForbiddenException("Only sellers can create a store");
    }

    const userAlreadyHasStore = await this.prisma.store.findUnique({
      where: { userId: user.sub },
    });

    if (userAlreadyHasStore) {
      throw new ConflictException("User already has a store");
    }

    const nameAlreadyExists = await this.prisma.store.findFirst({
      where: { name: { equals: dto.name.trim(), mode: "insensitive" } },
    });

    if (nameAlreadyExists) {
      throw new ConflictException("Store name already in use");
    }

    return this.prisma.store.create({
      data: {
        name: dto.name.trim(),
        description: dto.description.trim(),
        phone: dto.phone.trim(),
        address: dto.address.trim(),
        userId: user.sub,
      },
    });
  }
}
