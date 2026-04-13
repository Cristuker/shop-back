import { Body, Controller, Get, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { CurrentUser } from "src/auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "src/auth/guards/jwt-auth.guard";
import type { JwtPayload } from "src/auth/guards/jwt-auth.guard";
import { CreateStoreDto } from "./dto/create-store.dto";
import { ListStoreDto } from "./dto/list-store.dto";
import { UpdateStoreDto } from "./dto/update-store.dto";
import { StoreService } from "./store.service";

@Controller("store")
export class StoreController {
  constructor(private readonly storeService: StoreService) {}

  @Get()
  findAll(@Query() query: ListStoreDto) {
    return this.storeService.findAll(query);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Body() dto: CreateStoreDto, @CurrentUser() user: JwtPayload) {
    return this.storeService.create(dto, user);
  }

  @UseGuards(JwtAuthGuard)
  @Patch()
  update(@Body() dto: UpdateStoreDto, @CurrentUser() user: JwtPayload) {
    return this.storeService.update(dto, user);
  }
}
