import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { JwtPayload } from "src/auth/guards/jwt-auth.guard";
import { PrismaService } from "../prisma.service";
import { CreateStoreDto } from "./dto/create-store.dto";
import { ListStoreDto } from "./dto/list-store.dto";
import { UpdateStoreDto } from "./dto/update-store.dto";

@Injectable()
export class StoreService {
  constructor(private readonly prisma: PrismaService) {}

  findByUserId(userId: number) {
    return this.prisma.store.findUnique({ where: { userId } });
  }

  async findAll(query: ListStoreDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const where = query.name
      ? { name: { contains: query.name, mode: "insensitive" as const } }
      : undefined;

    const [data, total] = await Promise.all([
      this.prisma.store.findMany({ where, skip, take: limit }),
      this.prisma.store.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async update(dto: UpdateStoreDto, user: JwtPayload) {
    if (user.type !== "SELLER") {
      throw new ForbiddenException("Only sellers can update a store");
    }

    const store = await this.prisma.store.findUnique({
      where: { userId: user.sub },
    });

    if (!store) {
      throw new NotFoundException("Store not found");
    }

    if (dto.name !== undefined) {
      const trimmedName = dto.name.trim();
      const nameConflict = await this.prisma.store.findFirst({
        where: {
          name: { equals: trimmedName, mode: "insensitive" },
          NOT: { id: store.id },
        },
      });

      if (nameConflict) {
        throw new ConflictException("Store name already in use");
      }

      dto.name = trimmedName;
    }

    return this.prisma.store.update({
      where: { id: store.id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && {
          description: dto.description.trim(),
        }),
        ...(dto.phone !== undefined && { phone: dto.phone.trim() }),
        ...(dto.address !== undefined && { address: dto.address.trim() }),
      },
    });
  }

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
