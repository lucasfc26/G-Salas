-- CreateTable
CREATE TABLE "room_photos" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "imageKey" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "room_photos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "room_photos_roomId_idx" ON "room_photos"("roomId");

-- AddForeignKey
ALTER TABLE "room_photos" ADD CONSTRAINT "room_photos_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;
