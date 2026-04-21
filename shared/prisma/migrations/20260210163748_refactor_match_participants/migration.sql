-- CreateEnum
CREATE TYPE "MatchType" AS ENUM ('FFA', 'TEAM');

-- AlterTable
ALTER TABLE "matches" ADD COLUMN     "type" "MatchType" NOT NULL DEFAULT 'FFA',
ADD COLUMN     "winner_team_id" INTEGER;

-- CreateTable
CREATE TABLE "match_participants" (
    "id" SERIAL NOT NULL,
    "match_id" INTEGER NOT NULL,
    "user_id" INTEGER,
    "team_id" INTEGER NOT NULL,
    "character_name" "CharacterName" NOT NULL,
    "kills" INTEGER NOT NULL DEFAULT 0,
    "deaths" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "match_participants_pkey" PRIMARY KEY ("id")
);

-- MigrateData
INSERT INTO "match_participants" ("match_id", "user_id", "team_id", "character_name", "kills", "deaths")
SELECT "id", "player1_id", 1, "player1_character", "player1_kills", "player1_deaths"
FROM "matches"
WHERE "player1_id" IS NOT NULL;

INSERT INTO "match_participants" ("match_id", "user_id", "team_id", "character_name", "kills", "deaths")
SELECT "id", "player2_id", 2, "player2_character", "player2_kills", "player2_deaths"
FROM "matches"
WHERE "player2_id" IS NOT NULL;

UPDATE "matches" SET "winner_team_id" = 1 WHERE "winner_id" = "player1_id";
UPDATE "matches" SET "winner_team_id" = 2 WHERE "winner_id" = "player2_id";

-- DropForeignKeys
ALTER TABLE "matches" DROP CONSTRAINT "matches_player1_id_fkey";
ALTER TABLE "matches" DROP CONSTRAINT "matches_player2_id_fkey";
ALTER TABLE "matches" DROP CONSTRAINT "matches_winner_id_fkey";

-- AlterTable
ALTER TABLE "matches" DROP COLUMN "player1_id",
DROP COLUMN "player2_id",
DROP COLUMN "player1_character",
DROP COLUMN "player2_character",
DROP COLUMN "player1_kills",
DROP COLUMN "player2_kills",
DROP COLUMN "player1_deaths",
DROP COLUMN "player2_deaths",
DROP COLUMN "winner_id";

-- CreateIndex
CREATE INDEX "match_participants_match_id_idx" ON "match_participants"("match_id");

-- CreateIndex
CREATE INDEX "match_participants_user_id_idx" ON "match_participants"("user_id");

-- CreateIndex
CREATE INDEX "match_participants_match_id_team_id_idx" ON "match_participants"("match_id", "team_id");

-- AddForeignKey
ALTER TABLE "match_participants" ADD CONSTRAINT "match_participants_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_participants" ADD CONSTRAINT "match_participants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
