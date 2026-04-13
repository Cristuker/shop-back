import { Test, TestingModule } from "@nestjs/testing";
import { JwtService } from "@nestjs/jwt";
import { UnauthorizedException } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { UserService } from "../user/user.service";

jest.mock("bcrypt", () => ({
  compare: jest.fn(),
}));

import * as bcrypt from "bcrypt";

const mockUser = {
  id: 1,
  name: "Maria Loja",
  email: "maria@example.com",
  password: "$2b$10$hashedpassword",
  type: "SELLER",
  phone: "+5511987654321",
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("AuthService", () => {
  let authService: AuthService;
  let userService: { findByEmail: jest.Mock };
  let jwtService: { sign: jest.Mock };

  beforeEach(async () => {
    userService = { findByEmail: jest.fn() };
    jwtService = { sign: jest.fn().mockReturnValue("mocked.jwt.token") };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UserService, useValue: userService },
        { provide: JwtService, useValue: jwtService },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
  });

  it("should return an access_token on valid credentials", async () => {
    userService.findByEmail.mockResolvedValue(mockUser);
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);

    const result = await authService.login({
      email: "maria@example.com",
      password: "StrongPassword123",
    });

    expect(result).toEqual({ access_token: "mocked.jwt.token" });
    expect(jwtService.sign).toHaveBeenCalledWith({
      sub: mockUser.id,
      email: mockUser.email,
      type: mockUser.type,
    });
  });

  it("should normalise email to lowercase before lookup", async () => {
    userService.findByEmail.mockResolvedValue(mockUser);
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);

    await authService.login({
      email: "  MARIA@EXAMPLE.COM  ",
      password: "pass",
    });

    expect(userService.findByEmail).toHaveBeenCalledWith("maria@example.com");
  });

  it("should throw UnauthorizedException when user is not found", async () => {
    userService.findByEmail.mockResolvedValue(null);

    await expect(
      authService.login({ email: "unknown@example.com", password: "any" }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it("should throw UnauthorizedException when password is wrong", async () => {
    userService.findByEmail.mockResolvedValue(mockUser);
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);

    await expect(
      authService.login({
        email: "maria@example.com",
        password: "wrongpassword",
      }),
    ).rejects.toThrow(UnauthorizedException);
  });
});
