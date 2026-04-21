-- DropIndex
DROP INDEX "friendships_receiver_id_idx";

-- DropIndex
DROP INDEX "friendships_sender_id_idx";

-- AlterTable
ALTER TABLE "matches" ALTER COLUMN "type" DROP DEFAULT;

-- CreateIndex
CREATE INDEX "friendships_sender_id_status_idx" ON "friendships"("sender_id", "status");

-- CreateIndex
CREATE INDEX "friendships_receiver_id_status_idx" ON "friendships"("receiver_id", "status");

-- CreateIndex
CREATE INDEX "game_invites_sender_id_idx" ON "game_invites"("sender_id");

-- CreateIndex
CREATE INDEX "matches_played_at_idx" ON "matches"("played_at" DESC);
