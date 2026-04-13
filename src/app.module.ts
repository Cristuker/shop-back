import { Module } from "@nestjs/common";
import { PrismaModule } from "./prisma.module";
import { UserModule } from "./user/user.module";
import { AuthModule } from "./auth/auth.module";
import { OfferModule } from "./offer/offer.module";
import { StoreModule } from "./store/store.module";

@Module({
  imports: [PrismaModule, UserModule, AuthModule, OfferModule, StoreModule],
})
export class AppModule {}
