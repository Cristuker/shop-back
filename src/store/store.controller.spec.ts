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

const mockStore = {
  id: 1,
  ...validPayload,
  userId: 1,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

describe("StoreController", () => {
  let app: INestApplication<App>;
  let storeService: {
    findAll: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
  };

  beforeEach(async () => {
    storeService = {
      findAll: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [StoreController],
      providers: [{ provide: StoreService, useValue: storeService }],
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

  describe("GET /store", () => {
    it("should return paginated stores with 200", async () => {
      storeService.findAll.mockResolvedValue({
        data: [mockStore],
        total: 1,
        page: 1,
        limit: 10,
      });

      const response = await request(app.getHttpServer())
        .get("/store")
        .expect(200);

      expect(response.body).toMatchObject({ total: 1, page: 1, limit: 10 });
      expect(response.body.data).toHaveLength(1);
      expect(storeService.findAll).toHaveBeenCalledWith(
        expect.objectContaining({}),
      );
    });

    it("should forward name query param to service", async () => {
      storeService.findAll.mockResolvedValue({
        data: [mockStore],
        total: 1,
        page: 1,
        limit: 10,
      });

      await request(app.getHttpServer()).get("/store?name=maria").expect(200);

      expect(storeService.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ name: "maria" }),
      );
    });

    it("should forward page and limit query params to service", async () => {
      storeService.findAll.mockResolvedValue({
        data: [],
        total: 0,
        page: 2,
        limit: 5,
      });

      await request(app.getHttpServer())
        .get("/store?page=2&limit=5")
        .expect(200);

      expect(storeService.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ page: 2, limit: 5 }),
      );
    });

    it("should return 400 for non-numeric page", async () => {
      await request(app.getHttpServer()).get("/store?page=abc").expect(400);
    });

    it("should return 400 when page is less than 1", async () => {
      await request(app.getHttpServer()).get("/store?page=0").expect(400);
    });
  });

  describe("POST /store", () => {
    it("should create a store and return 201", async () => {
      storeService.create.mockResolvedValue(mockStore);

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

  describe("PATCH /store", () => {
    it("should update store and return 200", async () => {
      const updated = { ...mockStore, name: "Loja Atualizada" };
      storeService.update.mockResolvedValue(updated);

      const response = await request(app.getHttpServer())
        .patch("/store")
        .send({ name: "Loja Atualizada" })
        .expect(200);

      expect(response.body).toMatchObject({ name: "Loja Atualizada" });
      expect(storeService.update).toHaveBeenCalledWith(
        expect.objectContaining({ name: "Loja Atualizada" }),
        mockSeller,
      );
    });

    it("should accept partial updates (only description)", async () => {
      storeService.update.mockResolvedValue({
        ...mockStore,
        description: "Nova descrição",
      });

      await request(app.getHttpServer())
        .patch("/store")
        .send({ description: "Nova descrição" })
        .expect(200);

      expect(storeService.update).toHaveBeenCalledWith(
        expect.objectContaining({ description: "Nova descrição" }),
        mockSeller,
      );
    });

    it("should reject empty string name with 400", async () => {
      await request(app.getHttpServer())
        .patch("/store")
        .send({ name: "" })
        .expect(400)
        .then((res) => {
          expect(res.body.message[0]).toBe("Name cannot be empty");
        });
    });

    it("should reject invalid phone with 400", async () => {
      await request(app.getHttpServer())
        .patch("/store")
        .send({ phone: "abc" })
        .expect(400)
        .then((res) => {
          expect(res.body.message[0]).toBe(
            "Phone must be a valid Brazilian phone number",
          );
        });
    });

    it("should return 403 when service throws ForbiddenException", async () => {
      storeService.update.mockRejectedValue(
        new ForbiddenException("Only sellers can update a store"),
      );

      await request(app.getHttpServer())
        .patch("/store")
        .send({ name: "Nova Loja" })
        .expect(403);
    });

    it("should return 404 when store is not found", async () => {
      storeService.update.mockRejectedValue(
        new NotFoundException("Store not found"),
      );

      await request(app.getHttpServer())
        .patch("/store")
        .send({ name: "Nova Loja" })
        .expect(404);
    });

    it("should return 409 when new name is already in use", async () => {
      storeService.update.mockRejectedValue(
        new ConflictException("Store name already in use"),
      );

      await request(app.getHttpServer())
        .patch("/store")
        .send({ name: "Nome Existente" })
        .expect(409);
    });
  });
});
