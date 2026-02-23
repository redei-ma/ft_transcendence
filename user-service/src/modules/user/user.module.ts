import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { UserService } from "./services/user.service";
import { PrismaModule } from "../prisma/prisma.module";
import { InternalUserController } from "./controllers/internal-user.controller";
import { PublicUserController } from "./controllers/public-user.controller";

@Module({
	imports: [
		PrismaModule,
		JwtModule.register({
			secret: process.env.JWT_SECRET,
		}),
	],
	controllers: [InternalUserController, PublicUserController],
	providers: [UserService],
	exports: [UserService],
})
export class UserModule {}
