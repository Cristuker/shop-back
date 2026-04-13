import {
  Controller,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from "@nestjs/common";
import { CurrentUser } from "src/auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "src/auth/guards/jwt-auth.guard";
import type { JwtPayload } from "src/auth/guards/jwt-auth.guard";
import { InterestService } from "./interest.service";

@Controller("interests")
export class InterestController {
  constructor(private readonly interestService: InterestService) {}

  @UseGuards(JwtAuthGuard)
  @Post(":offerId")
  register(
    @Param("offerId", ParseIntPipe) offerId: number,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.interestService.register(offerId, user);
  }
}
