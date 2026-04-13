import { ConflictException, ForbiddenException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import type { JwtPayload } from "src/auth/guards/jwt-auth.guard";
import { PrismaService } from "../prisma.service";
import { StoreService } from "./store.service";
import { CreateStoreDto } from "./dto/create-store.dto";

const sellerUser: JwtPayload = {
  sub: 1,
  email: "seller@example.com",
  type: "SELLER",
};
const buyerUser: JwtPayload = {
  sub: 2,
  email: "buyer@example.com",
  type: "BUYER",
};

const mockStore = {
  id: 1,
  name: "Loja da Maria",
  description: "A melhor loja",
  phone: "11987654321",
  address: "Rua das Flores, 123",
  userId: 1,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const createDto: CreateStoreDto = {
  name: "Loja da Maria",
  description: "A melhor loja",
  phone: "11987654321",
  address: "Rua das Flores, 123",
};

describe("StoreService", () => {
  let service: StoreService;
  let prisma: {
    store: {
      findUnique: jest.Mock;
      findFirst: jest.Mock;
      create: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      store: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [StoreService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<StoreService>(StoreService);
  });

  describe("create", () => {
    it("should throw ForbiddenException when user is not a SELLER", async () => {
      await expect(service.create(createDto, buyerUser)).rejects.toThrow(
        ForbiddenException,
      );

      expect(prisma.store.findUnique).not.toHaveBeenCalled();
    });

    it("should throw ConflictException when user already has a store", async () => {
      prisma.store.findUnique.mockResolvedValue(mockStore);

      await expect(service.create(createDto, sellerUser)).rejects.toThrow(
        ConflictException,
      );

      expect(prisma.store.findFirst).not.toHaveBeenCalled();
    });

    it("should throw ConflictException when store name is already in use", async () => {
      prisma.store.findUnique.mockResolvedValue(null);
      prisma.store.findFirst.mockResolvedValue(mockStore);

      await expect(service.create(createDto, sellerUser)).rejects.toThrow(
        ConflictException,
      );

      expect(prisma.store.create).not.toHaveBeenCalled();
    });

    it("should create store successfully", async () => {
      prisma.store.findUnique.mockResolvedValue(null);
      prisma.store.findFirst.mockResolvedValue(null);
      prisma.store.create.mockResolvedValue(mockStore);

      const result = await service.create(createDto, sellerUser);

      expect(result).toEqual(mockStore);
      expect(prisma.store.create).toHaveBeenCalledWith({
        data: {
          name: createDto.name.trim(),
          description: createDto.description.trim(),
          phone: createDto.phone.trim(),
          address: createDto.address.trim(),
          userId: sellerUser.sub,
        },
      });
    });

    it("should trim whitespace from name before duplicate check and save", async () => {
      prisma.store.findUnique.mockResolvedValue(null);
      prisma.store.findFirst.mockResolvedValue(null);
      prisma.store.create.mockResolvedValue(mockStore);

      await service.create(
        { ...createDto, name: "  Loja da Maria  " },
        sellerUser,
      );

      expect(prisma.store.findFirst).toHaveBeenCalledWith({
        where: { name: { equals: "Loja da Maria", mode: "insensitive" } },
      });
      expect(prisma.store.create).toHaveBeenCalledWith(
        expect.objectContaining({
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          data: expect.objectContaining({ name: "Loja da Maria" }),
        }),
      );
    });
  });
});
