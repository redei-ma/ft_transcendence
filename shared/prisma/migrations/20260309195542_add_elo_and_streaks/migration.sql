-- AlterEnum
ALTER TYPE "MatchMode" ADD VALUE 'LOCAL';
ALTER TYPE "MatchMode" ADD VALUE 'AI';

-- AlterTable
ALTER TABLE "user_stats" ADD COLUMN     "best_win_streak" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "current_lose_streak" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "current_win_streak" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "elo_current" INTEGER NOT NULL DEFAULT 500,
ADD COLUMN     "elo_peak" INTEGER NOT NULL DEFAULT 500;
