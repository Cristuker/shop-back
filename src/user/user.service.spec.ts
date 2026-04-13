/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { TestingModule, Test } from "@nestjs/testing";
import { PrismaService } from "../prisma.service";
import { UserService } from "./user.service";
import { UserType } from "src/enums";
import { CreateUserDto } from "./dto/create-user.dto";
import { ConflictException } from "@nestjs/common";

const userArray: CreateUserDto[] = [
  {
    name: "João",
    phone: "13988089287",
    email: "cristian@email.com",
    password: "12312@12Abc",
    type: UserType.BUYER,
  },
];

const oneUser = userArray[0];

const db = {
  user: {
    findMany: jest.fn().mockResolvedValue(userArray),
    findUnique: jest.fn().mockResolvedValue(null),
    findFirst: jest.fn().mockResolvedValue(oneUser),
    create: jest.fn().mockReturnValue(oneUser),
    save: jest.fn(),
    update: jest.fn().mockResolvedValue(oneUser),
    delete: jest.fn().mockResolvedValue(oneUser),
  },
};

describe("UserService", () => {
  let prisma: PrismaService;
  let userService: UserService;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: PrismaService,
          useValue: db,
        },
      ],
    }).compile();

    prisma = app.get<PrismaService>(PrismaService);
    userService = app.get<UserService>(UserService);
  });

  it("should create a new user and hash the password", async () => {
    const spy = jest.spyOn(prisma.user, "create");
    const spyFindUnique = jest.spyOn(prisma.user, "findUnique");

    const result = await userService.create({
      name: "Maria Loja",
      email: "maria@example.com",
      password: "StrongPassword123",
      type: UserType.SELLER,
      phone: "+5511987654321",
    });

    expect(spyFindUnique).toHaveBeenCalledWith({
      where: { email: "maria@example.com" },
    });
    expect(spy).toHaveBeenCalledWith({
      data: expect.objectContaining({
        name: "Maria Loja",
        email: "maria@example.com",
        type: "SELLER",
        phone: "+5511987654321",
        password: expect.any(String),
      }),
    });
    expect(result.password).not.toBe("StrongPassword123");
  });

  it("should reject duplicate email", async () => {
    jest.spyOn(prisma.user, "findUnique").mockResolvedValue({
      id: 1,
      name: "Maria Loja",
      email: "maria@example.com",
      password: "existing",
      type: "SELLER",
      phone: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await expect(
      userService.create({
        name: "Maria Loja",
        email: "maria@example.com",
        password: "StrongPassword123",
        type: "seller",
      }),
    ).rejects.toThrow(ConflictException);
  });
});
