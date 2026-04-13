import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { CurrentUser } from "src/auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "src/auth/guards/jwt-auth.guard";
import type { JwtPayload } from "src/auth/guards/jwt-auth.guard";
import { CreateOfferDto } from "./dto/create-offer.dto";
import { ListOfferDto } from "./dto/list-offer.dto";
import { UpdateOfferDto } from "./dto/update-offer.dto";
import { OfferService } from "./offer.service";

@Controller("offers")
export class OfferController {
  constructor(private readonly offerService: OfferService) {}

  @Get()
  findActive(@Query() query: ListOfferDto) {
    return this.offerService.findActive(query);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Body() dto: CreateOfferDto, @CurrentUser() user: JwtPayload) {
    return this.offerService.create(dto, user);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(":id")
  update(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateOfferDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.offerService.update(id, dto, user);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(":id/close")
  close(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.offerService.close(id, user);
  }
}
