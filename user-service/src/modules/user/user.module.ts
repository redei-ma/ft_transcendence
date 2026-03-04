import { Module } from "@nestjs/common";
import { JwtAuthGuard } from "@transcendence/auth";
import { UserService } from "./services/user.service";
import { PrismaModule } from "../prisma/prisma.module";
import { InternalUserController } from "./controllers/internal-user.controller";
import { PublicUserController } from "./controllers/public-user.controller";

@Module({
	imports: [PrismaModule],
	controllers: [InternalUserController, PublicUserController],
	providers: [UserService, JwtAuthGuard],
	exports: [UserService],
})
export class UserModule {}
