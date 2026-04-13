/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  ConflictException,
  INestApplication,
  ValidationPipe,
} from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import request from "supertest";
import { App } from "supertest/types";
import { UserController } from "./user.controller";
import { UserService } from "./user.service";

describe("UserController", () => {
  let app: INestApplication<App>;
  let userService: { create: jest.Mock };

  beforeEach(async () => {
    userService = { create: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [{ provide: UserService, useValue: userService }],
    }).compile();

    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it("should create a user and return data without password", async () => {
    const createdAt = new Date();
    const updatedAt = new Date();

    userService.create.mockResolvedValue({
      id: 1,
      name: "Maria Loja",
      email: "maria@example.com",
      password: "$2b$10$hashedpassword",
      type: "SELLER",
      phone: "+5511987654321",
      createdAt,
      updatedAt,
    });

    const response = await request(app.getHttpServer())
      .post("/users")
      .send({
        name: "Maria Loja",
        email: "maria@example.com",
        password: "StrongPassword123",
        type: "seller",
        phone: "+5511987654321",
      })
      .expect(201);

    expect(response.body).not.toHaveProperty("password");
    expect(response.body).toMatchObject({
      id: 1,
      name: "Maria Loja",
      email: "maria@example.com",
      type: "SELLER",
      phone: "+5511987654321",
    });
    expect(userService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Maria Loja",
        email: "maria@example.com",
        password: "StrongPassword123",
        type: "SELLER",
        phone: "+5511987654321",
      }),
    );
  });

  it("should reject invalid email", async () => {
    await request(app.getHttpServer())
      .post("/users")
      .send({
        name: "Maria Loja",
        email: "maria-at-example.com",
        password: "StrongPassword123",
        type: "seller",
      })
      .expect(400)
      .then((res) => {
        expect(res.body.message[0]).toBe("A valid email is required");
      });
  });

  it("should reject invalid role", async () => {
    await request(app.getHttpServer())
      .post("/users")
      .send({
        name: "Maria Loja",
        email: "maria@example.com",
        password: "StrongPassword123",
        type: "manager",
      })
      .expect(400)
      .then((res) => {
        expect(res.body.message[0]).toBe("Type must be either seller or buyer");
      });
  });

  it("should reject invalid brazilian phone when provided", async () => {
    await request(app.getHttpServer())
      .post("/users")
      .send({
        name: "Maria Loja",
        email: "maria@example.com",
        password: "StrongPassword123",
        type: "seller",
        phone: "123-456",
      })
      .expect(400)
      .then((res) => {
        expect(res.body.message[0]).toBe(
          "If provided, phone must be a valid Brazilian phone number",
        );
      });
  });

  it("should reject duplicate email from service", async () => {
    userService.create.mockRejectedValue(
      new ConflictException("Email already in use"),
    );

    await request(app.getHttpServer())
      .post("/users")
      .send({
        name: "Maria Loja",
        email: "maria@example.com",
        password: "StrongPassword123",
        type: "seller",
      })
      .expect(409);
  });
});
