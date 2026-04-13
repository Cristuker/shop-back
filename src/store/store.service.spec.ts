import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
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
      findMany: jest.Mock;
      count: jest.Mock;
      findUnique: jest.Mock;
      findFirst: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      store: {
        findMany: jest.fn(),
        count: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [StoreService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<StoreService>(StoreService);
  });

  describe("findAll", () => {
    it("should return paginated stores without filter", async () => {
      const stores = [mockStore];
      prisma.store.findMany.mockResolvedValue(stores);
      prisma.store.count.mockResolvedValue(1);

      const result = await service.findAll({});

      expect(result).toEqual({ data: stores, total: 1, page: 1, limit: 10 });
      expect(prisma.store.findMany).toHaveBeenCalledWith({
        where: undefined,
        skip: 0,
        take: 10,
      });
      expect(prisma.store.count).toHaveBeenCalledWith({ where: undefined });
    });

    it("should filter stores by name (case-insensitive contains)", async () => {
      prisma.store.findMany.mockResolvedValue([mockStore]);
      prisma.store.count.mockResolvedValue(1);

      const result = await service.findAll({ name: "maria" });

      expect(result.data).toHaveLength(1);
      expect(prisma.store.findMany).toHaveBeenCalledWith({
        where: { name: { contains: "maria", mode: "insensitive" } },
        skip: 0,
        take: 10,
      });
    });

    it("should apply page and limit for pagination", async () => {
      prisma.store.findMany.mockResolvedValue([]);
      prisma.store.count.mockResolvedValue(20);

      const result = await service.findAll({ page: 3, limit: 5 });

      expect(result).toMatchObject({ total: 20, page: 3, limit: 5 });
      expect(prisma.store.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 10, take: 5 }),
      );
    });

    it("should return empty data when no stores match the filter", async () => {
      prisma.store.findMany.mockResolvedValue([]);
      prisma.store.count.mockResolvedValue(0);

      const result = await service.findAll({ name: "inexistente" });

      expect(result).toEqual({
        data: [],
        total: 0,
        page: 1,
        limit: 10,
      });
    });
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

  describe("update", () => {
    it("should throw ForbiddenException when user is not a SELLER", async () => {
      await expect(
        service.update({ name: "Nova Loja" }, buyerUser),
      ).rejects.toThrow(ForbiddenException);

      expect(prisma.store.findUnique).not.toHaveBeenCalled();
    });

    it("should throw NotFoundException when seller has no store", async () => {
      prisma.store.findUnique.mockResolvedValue(null);

      await expect(
        service.update({ name: "Nova Loja" }, sellerUser),
      ).rejects.toThrow(NotFoundException);

      expect(prisma.store.update).not.toHaveBeenCalled();
    });

    it("should throw ConflictException when new name is already in use by another store", async () => {
      prisma.store.findUnique.mockResolvedValue(mockStore);
      prisma.store.findFirst.mockResolvedValue({ ...mockStore, id: 99 });

      await expect(
        service.update({ name: "Outro Nome" }, sellerUser),
      ).rejects.toThrow(ConflictException);

      expect(prisma.store.update).not.toHaveBeenCalled();
    });

    it("should allow updating the name to the same value (no conflict with itself)", async () => {
      prisma.store.findUnique.mockResolvedValue(mockStore);
      prisma.store.findFirst.mockResolvedValue(null);
      prisma.store.update.mockResolvedValue(mockStore);

      const result = await service.update(
        { name: "Loja da Maria" },
        sellerUser,
      );

      expect(result).toEqual(mockStore);
      expect(prisma.store.findFirst).toHaveBeenCalledWith({
        where: {
          name: { equals: "Loja da Maria", mode: "insensitive" },
          NOT: { id: mockStore.id },
        },
      });
    });

    it("should update only provided fields", async () => {
      prisma.store.findUnique.mockResolvedValue(mockStore);
      prisma.store.update.mockResolvedValue({
        ...mockStore,
        description: "Descrição nova",
      });

      const result = await service.update(
        { description: "Descrição nova" },
        sellerUser,
      );

      expect(result.description).toBe("Descrição nova");
      expect(prisma.store.update).toHaveBeenCalledWith({
        where: { id: mockStore.id },
        data: { description: "Descrição nova" },
      });
      expect(prisma.store.findFirst).not.toHaveBeenCalled();
    });

    it("should trim whitespace from all updated fields", async () => {
      prisma.store.findUnique.mockResolvedValue(mockStore);
      prisma.store.findFirst.mockResolvedValue(null);
      prisma.store.update.mockResolvedValue(mockStore);

      await service.update(
        { name: "  Nova Loja  ", address: "  Rua Nova  " },
        sellerUser,
      );

      expect(prisma.store.update).toHaveBeenCalledWith({
        where: { id: mockStore.id },
        data: { name: "Nova Loja", address: "Rua Nova" },
      });
    });
  });
});
