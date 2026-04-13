/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
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
import { OfferController } from "./offer.controller";
import { OfferService } from "./offer.service";

const mockSeller: JwtPayload = {
  sub: 1,
  email: "seller@example.com",
  type: "SELLER",
};

const validPayload = {
  name: "Oferta Top",
  description: "Uma ótima oferta",
  value: 49.9,
  discount: 10,
  stock: 20,
  expiresAt: "2030-06-01T00:00:00.000Z",
};

const mockOffer = {
  id: 1,
  ...validPayload,
  status: "ACTIVE",
  storeId: 10,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

describe("OfferController", () => {
  let app: INestApplication<App>;
  let offerService: {
    findActive: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    close: jest.Mock;
  };

  beforeEach(async () => {
    offerService = {
      findActive: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      close: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [OfferController],
      providers: [{ provide: OfferService, useValue: offerService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (ctx: ExecutionContext) => {
          ctx.switchToHttp().getRequest().user = mockSeller;
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

  describe("GET /offers", () => {
    it("should return paginated active offers with 200 (no auth)", async () => {
      offerService.findActive.mockResolvedValue({
        data: [mockOffer],
        total: 1,
        page: 1,
        limit: 10,
      });

      const response = await request(app.getHttpServer())
        .get("/offers")
        .expect(200);

      expect(response.body).toMatchObject({ total: 1, page: 1, limit: 10 });
      expect(response.body.data).toHaveLength(1);
      expect(offerService.findActive).toHaveBeenCalledWith(
        expect.objectContaining({}),
      );
    });

    it("should forward status query param", async () => {
      offerService.findActive.mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        limit: 10,
      });

      await request(app.getHttpServer())
        .get("/offers?status=CLOSED")
        .expect(200);

      expect(offerService.findActive).toHaveBeenCalledWith(
        expect.objectContaining({ status: "CLOSED" }),
      );
    });

    it("should forward page and limit query params", async () => {
      offerService.findActive.mockResolvedValue({
        data: [],
        total: 0,
        page: 2,
        limit: 5,
      });

      await request(app.getHttpServer())
        .get("/offers?page=2&limit=5")
        .expect(200);

      expect(offerService.findActive).toHaveBeenCalledWith(
        expect.objectContaining({ page: 2, limit: 5 }),
      );
    });

    it("should return 400 for invalid status", async () => {
      await request(app.getHttpServer())
        .get("/offers?status=INVALID")
        .expect(400)
        .then((res) => {
          expect(res.body.message[0]).toBe(
            "Status must be ACTIVE, EXPIRED or CLOSED",
          );
        });
    });

    it("should return 400 when page is less than 1", async () => {
      await request(app.getHttpServer()).get("/offers?page=0").expect(400);
    });
  });

  describe("POST /offers", () => {
    it("should create an offer and return 201", async () => {
      offerService.create.mockResolvedValue(mockOffer);

      const response = await request(app.getHttpServer())
        .post("/offers")
        .send(validPayload)
        .expect(201);

      expect(response.body).toMatchObject({ id: 1, name: validPayload.name });
      expect(offerService.create).toHaveBeenCalledWith(
        expect.objectContaining({ name: validPayload.name }),
        mockSeller,
      );
    });

    it("should reject missing name with 400", async () => {
      await request(app.getHttpServer())
        .post("/offers")
        .send({ ...validPayload, name: "" })
        .expect(400)
        .then((res) => {
          expect(res.body.message[0]).toBe("Name is required");
        });
    });

    it("should reject missing description with 400", async () => {
      await request(app.getHttpServer())
        .post("/offers")
        .send({ ...validPayload, description: "" })
        .expect(400)
        .then((res) => {
          expect(res.body.message[0]).toBe("Description is required");
        });
    });

    it("should reject value of 0 with 400", async () => {
      await request(app.getHttpServer())
        .post("/offers")
        .send({ ...validPayload, value: 0 })
        .expect(400)
        .then((res) => {
          expect(res.body.message[0]).toBe("Value must be greater than 0");
        });
    });

    it("should reject discount above 100 with 400", async () => {
      await request(app.getHttpServer())
        .post("/offers")
        .send({ ...validPayload, discount: 101 })
        .expect(400)
        .then((res) => {
          expect(res.body.message[0]).toBe("Discount must be at most 100");
        });
    });

    it("should reject negative stock with 400", async () => {
      await request(app.getHttpServer())
        .post("/offers")
        .send({ ...validPayload, stock: -1 })
        .expect(400)
        .then((res) => {
          expect(res.body.message[0]).toBe("Stock must be at least 0");
        });
    });

    it("should reject invalid expiresAt with 400", async () => {
      await request(app.getHttpServer())
        .post("/offers")
        .send({ ...validPayload, expiresAt: "not-a-date" })
        .expect(400)
        .then((res) => {
          expect(res.body.message[0]).toBe(
            "ExpiresAt must be a valid ISO date string",
          );
        });
    });

    it("should return 403 when service throws ForbiddenException", async () => {
      offerService.create.mockRejectedValue(
        new ForbiddenException("Only sellers can create offers"),
      );

      await request(app.getHttpServer())
        .post("/offers")
        .send(validPayload)
        .expect(403);
    });

    it("should return 404 when seller has no store", async () => {
      offerService.create.mockRejectedValue(
        new NotFoundException("Store not found for this seller"),
      );

      await request(app.getHttpServer())
        .post("/offers")
        .send(validPayload)
        .expect(404);
    });
  });

  describe("PATCH /offers/:id", () => {
    it("should update offer and return 200", async () => {
      offerService.update.mockResolvedValue({ ...mockOffer, stock: 99 });

      const response = await request(app.getHttpServer())
        .patch("/offers/1")
        .send({ stock: 99 })
        .expect(200);

      expect(response.body).toMatchObject({ stock: 99 });
      expect(offerService.update).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ stock: 99 }),
        mockSeller,
      );
    });

    it("should reject empty name with 400", async () => {
      await request(app.getHttpServer())
        .patch("/offers/1")
        .send({ name: "" })
        .expect(400)
        .then((res) => {
          expect(res.body.message[0]).toBe("Name cannot be empty");
        });
    });

    it("should reject discount above 100 with 400", async () => {
      await request(app.getHttpServer())
        .patch("/offers/1")
        .send({ discount: 150 })
        .expect(400)
        .then((res) => {
          expect(res.body.message[0]).toBe("Discount must be at most 100");
        });
    });

    it("should return 400 for non-numeric id", async () => {
      await request(app.getHttpServer())
        .patch("/offers/abc")
        .send({ stock: 5 })
        .expect(400);
    });

    it("should return 404 when offer not found", async () => {
      offerService.update.mockRejectedValue(
        new NotFoundException("Offer not found"),
      );

      await request(app.getHttpServer())
        .patch("/offers/999")
        .send({ stock: 5 })
        .expect(404);
    });

    it("should return 403 when offer belongs to another seller", async () => {
      offerService.update.mockRejectedValue(
        new ForbiddenException(
          "You can only update offers from your own store",
        ),
      );

      await request(app.getHttpServer())
        .patch("/offers/1")
        .send({ stock: 5 })
        .expect(403);
    });
  });

  describe("PATCH /offers/:id/close", () => {
    it("should close offer and return 200", async () => {
      offerService.close.mockResolvedValue({ ...mockOffer, status: "CLOSED" });

      const response = await request(app.getHttpServer())
        .patch("/offers/1/close")
        .expect(200);

      expect(response.body).toMatchObject({ status: "CLOSED" });
      expect(offerService.close).toHaveBeenCalledWith(1, mockSeller);
    });

    it("should return 400 for non-numeric id", async () => {
      await request(app.getHttpServer()).patch("/offers/abc/close").expect(400);
    });

    it("should return 404 when offer not found", async () => {
      offerService.close.mockRejectedValue(
        new NotFoundException("Offer not found"),
      );

      await request(app.getHttpServer()).patch("/offers/999/close").expect(404);
    });

    it("should return 403 when offer belongs to another seller", async () => {
      offerService.close.mockRejectedValue(
        new ForbiddenException("You can only close offers from your own store"),
      );

      await request(app.getHttpServer()).patch("/offers/1/close").expect(403);
    });
  });
});
