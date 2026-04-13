import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import { CurrentUser } from "src/auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "src/auth/guards/jwt-auth.guard";
import type { JwtPayload } from "src/auth/guards/jwt-auth.guard";
import { CreateStoreDto } from "./dto/create-store.dto";
import { StoreService } from "./store.service";

@Controller("store")
export class StoreController {
  constructor(private readonly storeService: StoreService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Body() dto: CreateStoreDto, @CurrentUser() user: JwtPayload) {
    return this.storeService.create(dto, user);
  }
}
