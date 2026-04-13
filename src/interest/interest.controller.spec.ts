/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  ConflictException,
  ExecutionContext,
  ForbiddenException,
  INestApplication,
  NotFoundException,
  ValidationPipe,
} from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import request from "supertest";
import { App } from "supertest/types";
import type { JwtPayload } from "src/auth/guards/jwt-auth.guard";
import { JwtAuthGuard } from "src/auth/guards/jwt-auth.guard";
import { InterestController } from "./interest.controller";
import { InterestService } from "./interest.service";

const mockBuyer: JwtPayload = {
  sub: 2,
  email: "buyer@example.com",
  type: "BUYER",
};

const mockInterest = {
  id: 1,
  userId: 2,
  offerId: 10,
  createdAt: new Date().toISOString(),
};

describe("InterestController", () => {
  let app: INestApplication<App>;
  let interestService: { register: jest.Mock };

  beforeEach(async () => {
    interestService = { register: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [InterestController],
      providers: [{ provide: InterestService, useValue: interestService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (ctx: ExecutionContext) => {
          ctx.switchToHttp().getRequest().user = mockBuyer;
          return true;
        },
      })
      .compile();

    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  describe("POST /interests/:offerId", () => {
    it("should register interest and return 201", async () => {
      interestService.register.mockResolvedValue(mockInterest);

      const response = await request(app.getHttpServer())
        .post("/interests/10")
        .expect(201);

      expect(response.body).toMatchObject({ userId: 2, offerId: 10 });
      expect(interestService.register).toHaveBeenCalledWith(10, mockBuyer);
    });

    it("should return 400 for non-numeric offerId", async () => {
      await request(app.getHttpServer()).post("/interests/abc").expect(400);
    });

    it("should return 403 when service throws ForbiddenException", async () => {
      interestService.register.mockRejectedValue(
        new ForbiddenException("Only buyers can register interest in offers"),
      );

      await request(app.getHttpServer()).post("/interests/10").expect(403);
    });

    it("should return 404 when offer does not exist", async () => {
      interestService.register.mockRejectedValue(
        new NotFoundException("Offer not found"),
      );

      await request(app.getHttpServer()).post("/interests/999").expect(404);
    });

    it("should return 409 when offer is not active", async () => {
      interestService.register.mockRejectedValue(
        new ConflictException("Offer is not active"),
      );

      await request(app.getHttpServer()).post("/interests/10").expect(409);
    });

    it("should return 409 when offer is out of stock", async () => {
      interestService.register.mockRejectedValue(
        new ConflictException("Offer is out of stock"),
      );

      await request(app.getHttpServer()).post("/interests/10").expect(409);
    });

    it("should return 409 when buyer already registered interest", async () => {
      interestService.register.mockRejectedValue(
        new ConflictException(
          "You have already registered interest in this offer",
        ),
      );

      await request(app.getHttpServer()).post("/interests/10").expect(409);
    });
  });
});
