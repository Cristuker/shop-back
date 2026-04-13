/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import type { JwtPayload } from "src/auth/guards/jwt-auth.guard";
import { PrismaService } from "src/prisma.service";
import { StoreService } from "src/store/store.service";
import { OfferService } from "./offer.service";

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
const otherSeller: JwtPayload = {
  sub: 99,
  email: "other@example.com",
  type: "SELLER",
};

const mockStore = { id: 10, userId: 1, name: "Loja da Maria" };
const mockOffer = {
  id: 1,
  name: "Oferta Top",
  description: "Boa oferta",
  value: 99.9,
  discount: 10,
  stock: 5,
  expiresAt: new Date("2030-01-01"),
  status: "ACTIVE",
  storeId: 10,
  store: mockStore,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const createDto = {
  name: "Oferta Top",
  description: "Boa oferta",
  value: 99.9,
  discount: 10,
  stock: 5,
  expiresAt: "2030-01-01T00:00:00.000Z",
};

describe("OfferService", () => {
  let service: OfferService;
  let prisma: {
    offer: {
      findMany: jest.Mock;
      count: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
  };
  let storeService: { findByUserId: jest.Mock };

  beforeEach(async () => {
    prisma = {
      offer: {
        findMany: jest.fn(),
        count: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };
    storeService = { findByUserId: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OfferService,
        { provide: PrismaService, useValue: prisma },
        { provide: StoreService, useValue: storeService },
      ],
    }).compile();

    service = module.get<OfferService>(OfferService);
  });

  describe("findActive", () => {
    it("should return ACTIVE offers by default with pagination", async () => {
      prisma.offer.findMany.mockResolvedValue([mockOffer]);
      prisma.offer.count.mockResolvedValue(1);

      const result = await service.findActive({});

      expect(result).toEqual({
        data: [mockOffer],
        total: 1,
        page: 1,
        limit: 10,
      });
      expect(prisma.offer.findMany).toHaveBeenCalledWith({
        where: { status: "ACTIVE" },
        skip: 0,
        take: 10,
      });
    });

    it("should filter by provided status", async () => {
      prisma.offer.findMany.mockResolvedValue([]);
      prisma.offer.count.mockResolvedValue(0);

      await service.findActive({ status: "CLOSED" });

      expect(prisma.offer.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { status: "CLOSED" } }),
      );
    });

    it("should apply page and limit", async () => {
      prisma.offer.findMany.mockResolvedValue([]);
      prisma.offer.count.mockResolvedValue(50);

      const result = await service.findActive({ page: 3, limit: 5 });

      expect(result).toMatchObject({ page: 3, limit: 5, total: 50 });
      expect(prisma.offer.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 10, take: 5 }),
      );
    });
  });

  describe("create", () => {
    it("should throw ForbiddenException when user is not a SELLER", async () => {
      await expect(service.create(createDto, buyerUser)).rejects.toThrow(
        ForbiddenException,
      );
      expect(storeService.findByUserId).not.toHaveBeenCalled();
    });

    it("should throw NotFoundException when seller has no store", async () => {
      storeService.findByUserId.mockResolvedValue(null);

      await expect(service.create(createDto, sellerUser)).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.offer.create).not.toHaveBeenCalled();
    });

    it("should create offer linked to seller's store", async () => {
      storeService.findByUserId.mockResolvedValue(mockStore);
      prisma.offer.create.mockResolvedValue(mockOffer);

      const result = await service.create(createDto, sellerUser);

      expect(result).toEqual(mockOffer);
      expect(storeService.findByUserId).toHaveBeenCalledWith(sellerUser.sub);
      expect(prisma.offer.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: "Oferta Top",
          storeId: mockStore.id,
        }),
      });
    });

    it("should trim whitespace from name and description", async () => {
      storeService.findByUserId.mockResolvedValue(mockStore);
      prisma.offer.create.mockResolvedValue(mockOffer);

      await service.create(
        { ...createDto, name: "  Oferta  ", description: "  Desc  " },
        sellerUser,
      );

      expect(prisma.offer.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ name: "Oferta", description: "Desc" }),
      });
    });
  });

  describe("update", () => {
    it("should throw ForbiddenException when user is not a SELLER", async () => {
      await expect(
        service.update(1, { name: "Novo" }, buyerUser),
      ).rejects.toThrow(ForbiddenException);
      expect(prisma.offer.findUnique).not.toHaveBeenCalled();
    });

    it("should throw NotFoundException when offer does not exist", async () => {
      prisma.offer.findUnique.mockResolvedValue(null);

      await expect(
        service.update(999, { name: "Novo" }, sellerUser),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.offer.update).not.toHaveBeenCalled();
    });

    it("should throw ForbiddenException when offer belongs to another seller", async () => {
      prisma.offer.findUnique.mockResolvedValue(mockOffer);

      await expect(
        service.update(1, { name: "Novo" }, otherSeller),
      ).rejects.toThrow(ForbiddenException);
      expect(prisma.offer.update).not.toHaveBeenCalled();
    });

    it("should update only provided fields", async () => {
      prisma.offer.findUnique.mockResolvedValue(mockOffer);
      prisma.offer.update.mockResolvedValue({ ...mockOffer, stock: 99 });

      const result = await service.update(1, { stock: 99 }, sellerUser);

      expect(result.stock).toBe(99);
      expect(prisma.offer.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { stock: 99 },
      });
    });

    it("should trim name and description on update", async () => {
      prisma.offer.findUnique.mockResolvedValue(mockOffer);
      prisma.offer.update.mockResolvedValue(mockOffer);

      await service.update(
        1,
        { name: "  Novo Nome  ", description: "  Desc  " },
        sellerUser,
      );

      expect(prisma.offer.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: expect.objectContaining({
          name: "Novo Nome",
          description: "Desc",
        }),
      });
    });
  });

  describe("close", () => {
    it("should throw ForbiddenException when user is not a SELLER", async () => {
      await expect(service.close(1, buyerUser)).rejects.toThrow(
        ForbiddenException,
      );
      expect(prisma.offer.findUnique).not.toHaveBeenCalled();
    });

    it("should throw NotFoundException when offer does not exist", async () => {
      prisma.offer.findUnique.mockResolvedValue(null);

      await expect(service.close(999, sellerUser)).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.offer.update).not.toHaveBeenCalled();
    });

    it("should throw ForbiddenException when offer belongs to another seller", async () => {
      prisma.offer.findUnique.mockResolvedValue(mockOffer);

      await expect(service.close(1, otherSeller)).rejects.toThrow(
        ForbiddenException,
      );
      expect(prisma.offer.update).not.toHaveBeenCalled();
    });

    it("should set status to CLOSED", async () => {
      prisma.offer.findUnique.mockResolvedValue(mockOffer);
      prisma.offer.update.mockResolvedValue({ ...mockOffer, status: "CLOSED" });

      const result = await service.close(1, sellerUser);

      expect(result.status).toBe("CLOSED");
      expect(prisma.offer.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { status: "CLOSED" },
      });
    });
  });
});
