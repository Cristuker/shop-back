import { ConflictException, Injectable } from "@nestjs/common";
import * as bcrypt from "bcrypt";
import { CreateUserDto } from "./dto/create-user.dto";
import { UserType } from "./user.types";
import { PrismaService } from "../prisma.service";
import { User } from "generated/prisma/client";

const SALT_ROUNDS = 10;

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    const email = createUserDto.email.trim().toLowerCase();
    const existing = await this.findByEmail(email);
    if (existing) {
      throw new ConflictException("Email already in use");
    }

    const passwordHash = await this.hashPassword(createUserDto.password);
    return this.prisma.user.create({
      data: {
        name: createUserDto.name.trim(),
        email,
        password: passwordHash,
        type: createUserDto.type.trim().toUpperCase() as UserType,
        phone: createUserDto.phone?.trim() || undefined,
      },
    });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });
  }

  private async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, SALT_ROUNDS);
  }
}
