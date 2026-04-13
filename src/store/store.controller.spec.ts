/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  ConflictException,
  ForbiddenException,
  INestApplication,
  ValidationPipe,
} from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import request from "supertest";
import { App } from "supertest/types";
import type { JwtPayload } from "src/auth/guards/jwt-auth.guard";
import { JwtAuthGuard } from "src/auth/guards/jwt-auth.guard";
import { StoreController } from "./store.controller";
import { StoreService } from "./store.service";

const mockSeller: JwtPayload = {
  sub: 1,
  email: "seller@example.com",
  type: "SELLER",
};

const validPayload = {
  name: "Loja da Maria",
  description: "A melhor loja",
  phone: "11987654321",
  address: "Rua das Flores, 123",
};

describe("StoreController", () => {
  let app: INestApplication<App>;
  let storeService: { create: jest.Mock };

  beforeEach(async () => {
    storeService = { create: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [StoreController],
      providers: [{ provide: StoreService, useValue: storeService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (ctx) => {
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

  it("should create a store and return 201", async () => {
    const createdAt = new Date();
    storeService.create.mockResolvedValue({
      id: 1,
      ...validPayload,
      userId: 1,
      createdAt,
      updatedAt: createdAt,
    });

    const response = await request(app.getHttpServer())
      .post("/store")
      .send(validPayload)
      .expect(201);

    expect(response.body).toMatchObject({
      id: 1,
      name: validPayload.name,
      userId: 1,
    });
    expect(storeService.create).toHaveBeenCalledWith(
      expect.objectContaining(validPayload),
      mockSeller,
    );
  });

  it("should reject missing name with 400", async () => {
    await request(app.getHttpServer())
      .post("/store")
      .send({ ...validPayload, name: "" })
      .expect(400)
      .then((res) => {
        expect(res.body.message[0]).toBe("Name is required");
      });
  });

  it("should reject missing description with 400", async () => {
    await request(app.getHttpServer())
      .post("/store")
      .send({ ...validPayload, description: "" })
      .expect(400)
      .then((res) => {
        expect(res.body.message[0]).toBe("Description is required");
      });
  });

  it("should reject invalid phone with 400", async () => {
    await request(app.getHttpServer())
      .post("/store")
      .send({ ...validPayload, phone: "123-abc" })
      .expect(400)
      .then((res) => {
        expect(res.body.message[0]).toBe(
          "Phone must be a valid Brazilian phone number",
        );
      });
  });

  it("should reject missing address with 400", async () => {
    await request(app.getHttpServer())
      .post("/store")
      .send({ ...validPayload, address: "" })
      .expect(400)
      .then((res) => {
        expect(res.body.message[0]).toBe("Address is required");
      });
  });

  it("should return 403 when service throws ForbiddenException", async () => {
    storeService.create.mockRejectedValue(
      new ForbiddenException("Only sellers can create a store"),
    );

    await request(app.getHttpServer())
      .post("/store")
      .send(validPayload)
      .expect(403);
  });

  it("should return 409 when user already has a store", async () => {
    storeService.create.mockRejectedValue(
      new ConflictException("User already has a store"),
    );

    await request(app.getHttpServer())
      .post("/store")
      .send(validPayload)
      .expect(409);
  });

  it("should return 409 when store name is already in use", async () => {
    storeService.create.mockRejectedValue(
      new ConflictException("Store name already in use"),
    );

    await request(app.getHttpServer())
      .post("/store")
      .send(validPayload)
      .expect(409);
  });
});
