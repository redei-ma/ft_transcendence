-- CreateEnum
CREATE TYPE "Provider" AS ENUM ('LOCAL', 'GOOGLE');

-- CreateTable
CREATE TABLE "accounts" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "provider" "Provider" NOT NULL,
    "password_hash" TEXT,
    "provider_id" TEXT,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- MigrateData
INSERT INTO "accounts" ("user_id", "provider", "password_hash")
SELECT "id", 'LOCAL'::"Provider", "password_hash"
FROM "users"
WHERE "password_hash" IS NOT NULL;

INSERT INTO "accounts" ("user_id", "provider", "provider_id")
SELECT "id", 'GOOGLE'::"Provider", "oauth_id"
FROM "users"
WHERE "oauth_id" IS NOT NULL;

-- AlterTable
ALTER TABLE "users" DROP COLUMN "password_hash",
DROP COLUMN "oauth_id";

-- CreateIndex
CREATE UNIQUE INDEX "accounts_user_id_provider_key" ON "accounts"("user_id", "provider");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_provider_provider_id_key" ON "accounts"("provider", "provider_id");

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
