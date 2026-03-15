-- CreateEnum
CREATE TYPE "CharacterName" AS ENUM ('ADE', 'ZEUS');

-- CreateEnum
CREATE TYPE "MatchMode" AS ENUM ('RANKED', 'UNRANKED');

-- CreateEnum
CREATE TYPE "EndReason" AS ENUM ('TIMEOUT', 'RESIGNATION', 'KILLOUT');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "deaths" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "kills" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "losses" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "wins" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "matches" (
    "id" SERIAL NOT NULL,
    "played_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "mode" "MatchMode" NOT NULL,
    "duration_seconds" INTEGER NOT NULL,
    "end_reason" "EndReason",
    "player1_id" INTEGER NOT NULL,
    "player2_id" INTEGER NOT NULL,
    "player1_character" "CharacterName" NOT NULL,
    "player2_character" "CharacterName" NOT NULL,
    "player1_kills" INTEGER NOT NULL DEFAULT 0,
    "player2_kills" INTEGER NOT NULL DEFAULT 0,
    "player1_deaths" INTEGER NOT NULL DEFAULT 0,
    "player2_deaths" INTEGER NOT NULL DEFAULT 0,
    "winner_id" INTEGER,

    CONSTRAINT "matches_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_player1_id_fkey" FOREIGN KEY ("player1_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_player2_id_fkey" FOREIGN KEY ("player2_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_winner_id_fkey" FOREIGN KEY ("winner_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
