-- CreateTable
CREATE TABLE "character_stats" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "character_name" "CharacterName" NOT NULL,
    "wins" INTEGER NOT NULL DEFAULT 0,
    "losses" INTEGER NOT NULL DEFAULT 0,
    "draws" INTEGER NOT NULL DEFAULT 0,
    "kills" INTEGER NOT NULL DEFAULT 0,
    "deaths" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "character_stats_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "character_stats_user_id_character_name_key" ON "character_stats"("user_id", "character_name");

-- AddForeignKey
ALTER TABLE "character_stats" ADD CONSTRAINT "character_stats_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
