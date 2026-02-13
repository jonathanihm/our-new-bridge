-- CreateEnum
CREATE TYPE "AvailabilityStatus" AS ENUM ('yes', 'no', 'not_sure');

-- AlterTable
ALTER TABLE "Resource" ADD COLUMN     "availabilityStatus" "AvailabilityStatus",
ADD COLUMN     "lastAvailableAt" TIMESTAMP(3);
