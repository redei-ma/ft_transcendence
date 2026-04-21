-- CreateTable
CREATE TABLE "user_stats" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "total_wins" INTEGER NOT NULL DEFAULT 0,
    "total_losses" INTEGER NOT NULL DEFAULT 0,
    "total_draws" INTEGER NOT NULL DEFAULT 0,
    "total_kills" INTEGER NOT NULL DEFAULT 0,
    "total_deaths" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "user_stats_pkey" PRIMARY KEY ("id")
);

-- MigrateData
INSERT INTO "user_stats" ("user_id", "total_wins", "total_losses", "total_kills", "total_deaths")
SELECT "id", "wins", "losses", "kills", "deaths"
FROM "users";

-- AlterTable
ALTER TABLE "users" DROP COLUMN "wins",
DROP COLUMN "losses",
DROP COLUMN "kills",
DROP COLUMN "deaths";

-- CreateIndex
CREATE UNIQUE INDEX "user_stats_user_id_key" ON "user_stats"("user_id");

-- AddForeignKey
ALTER TABLE "user_stats" ADD CONSTRAINT "user_stats_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
