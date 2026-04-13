/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  INestApplication,
  UnauthorizedException,
  ValidationPipe,
} from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import request from "supertest";
import { App } from "supertest/types";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";

describe("AuthController", () => {
  let app: INestApplication<App>;
  let authService: { login: jest.Mock };

  beforeEach(async () => {
    authService = { login: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: authService }],
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

  it("should return access_token on valid login", async () => {
    authService.login.mockResolvedValue({ access_token: "mocked.jwt.token" });

    const response = await request(app.getHttpServer())
      .post("/auth/login")
      .send({ email: "maria@example.com", password: "StrongPassword123" })
      .expect(200);

    expect(response.body).toEqual({ access_token: "mocked.jwt.token" });
    expect(authService.login).toHaveBeenCalledWith({
      email: "maria@example.com",
      password: "StrongPassword123",
    });
  });

  it("should reject invalid email format", async () => {
    await request(app.getHttpServer())
      .post("/auth/login")
      .send({ email: "invalid-email", password: "password123" })
      .expect(400)
      .then((res) => {
        expect(res.body.message[0]).toBe("A valid email is required");
      });
  });

  it("should reject missing email", async () => {
    await request(app.getHttpServer())
      .post("/auth/login")
      .send({ email: "", password: "password123" })
      .expect(400);
  });

  it("should reject missing password", async () => {
    await request(app.getHttpServer())
      .post("/auth/login")
      .send({ email: "maria@example.com", password: "" })
      .expect(400)
      .then((res) => {
        expect(res.body.message[0]).toBe("Password is required");
      });
  });

  it("should propagate UnauthorizedException from AuthService as 401", async () => {
    authService.login.mockRejectedValue(
      new UnauthorizedException("Invalid credentials"),
    );

    await request(app.getHttpServer())
      .post("/auth/login")
      .send({ email: "maria@example.com", password: "wrongpass" })
      .expect(401);
  });
});
