/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import type { JwtPayload } from "src/auth/guards/jwt-auth.guard";
import { OfferService } from "src/offer/offer.service";
import { PrismaService } from "src/prisma.service";
import { InterestService } from "./interest.service";

const buyerUser: JwtPayload = {
  sub: 2,
  email: "buyer@example.com",
  type: "BUYER",
};
const sellerUser: JwtPayload = {
  sub: 1,
  email: "seller@example.com",
  type: "SELLER",
};

const activeOffer = {
  id: 10,
  name: "Oferta Top",
  status: "ACTIVE",
  stock: 5,
  storeId: 1,
};

const mockInterest = {
  id: 1,
  userId: 2,
  offerId: 10,
  createdAt: new Date(),
};

describe("InterestService", () => {
  let service: InterestService;
  let prisma: {
    interest: { findUnique: jest.Mock; create: jest.Mock };
    $transaction: jest.Mock;
  };
  let offerService: { findById: jest.Mock; decrementStock: jest.Mock };

  beforeEach(async () => {
    prisma = {
      interest: { findUnique: jest.fn(), create: jest.fn() },
      $transaction: jest.fn(),
    };
    offerService = { findById: jest.fn(), decrementStock: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InterestService,
        { provide: PrismaService, useValue: prisma },
        { provide: OfferService, useValue: offerService },
      ],
    }).compile();

    service = module.get<InterestService>(InterestService);
  });

  it("should throw ForbiddenException when user is not a BUYER", async () => {
    await expect(service.register(10, sellerUser)).rejects.toThrow(
      ForbiddenException,
    );
    expect(offerService.findById).not.toHaveBeenCalled();
  });

  it("should throw NotFoundException when offer does not exist", async () => {
    offerService.findById.mockResolvedValue(null);

    await expect(service.register(999, buyerUser)).rejects.toThrow(
      NotFoundException,
    );
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("should throw ConflictException when offer is not ACTIVE", async () => {
    offerService.findById.mockResolvedValue({
      ...activeOffer,
      status: "CLOSED",
    });

    await expect(service.register(10, buyerUser)).rejects.toThrow(
      ConflictException,
    );
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("should throw ConflictException when offer is out of stock", async () => {
    offerService.findById.mockResolvedValue({ ...activeOffer, stock: 0 });

    await expect(service.register(10, buyerUser)).rejects.toThrow(
      ConflictException,
    );
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("should throw ConflictException when buyer already registered interest", async () => {
    offerService.findById.mockResolvedValue(activeOffer);
    prisma.interest.findUnique.mockResolvedValue(mockInterest);

    await expect(service.register(10, buyerUser)).rejects.toThrow(
      ConflictException,
    );
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("should create interest and decrement stock in a transaction", async () => {
    offerService.findById.mockResolvedValue(activeOffer);
    offerService.decrementStock.mockReturnValue({ id: 10, stock: 4 });
    prisma.interest.findUnique.mockResolvedValue(null);
    prisma.interest.create.mockReturnValue(mockInterest);
    prisma.$transaction.mockResolvedValue([
      mockInterest,
      { ...activeOffer, stock: 4 },
    ]);

    const result = await service.register(10, buyerUser);

    expect(result).toEqual(mockInterest);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(offerService.decrementStock).toHaveBeenCalledWith(10);
  });

  it("should check duplicate with correct userId and offerId", async () => {
    offerService.findById.mockResolvedValue(activeOffer);
    offerService.decrementStock.mockReturnValue({ id: 10, stock: 4 });
    prisma.interest.findUnique.mockResolvedValue(null);
    prisma.interest.create.mockReturnValue(mockInterest);
    prisma.$transaction.mockResolvedValue([mockInterest, activeOffer]);

    await service.register(10, buyerUser);

    expect(prisma.interest.findUnique).toHaveBeenCalledWith({
      where: { userId_offerId: { userId: buyerUser.sub, offerId: 10 } },
    });
  });
});
