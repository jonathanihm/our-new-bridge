-- CreateEnum
CREATE TYPE "ResourceCategory" AS ENUM ('food', 'shelter', 'housing', 'legal');

-- CreateEnum
CREATE TYPE "ResourceUpdateStatus" AS ENUM ('pending', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "ResourceUpdateType" AS ENUM ('add', 'update');

-- CreateTable
CREATE TABLE "City" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "state" TEXT,
    "fullName" TEXT,
    "tagline" TEXT NOT NULL DEFAULT 'Find help. Fast.',
    "description" TEXT NOT NULL DEFAULT 'A simple, humane platform for finding essential resources',
    "centerLat" DOUBLE PRECISION NOT NULL,
    "centerLng" DOUBLE PRECISION NOT NULL,
    "defaultZoom" INTEGER NOT NULL DEFAULT 12,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "City_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Resource" (
    "id" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "category" "ResourceCategory" NOT NULL DEFAULT 'food',
    "cityId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "hours" TEXT,
    "daysOpen" TEXT,
    "phone" TEXT,
    "website" TEXT,
    "requiresId" BOOLEAN NOT NULL DEFAULT false,
    "walkIn" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Resource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResourceUpdateRequest" (
    "id" TEXT NOT NULL,
    "citySlug" TEXT NOT NULL,
    "resourceExternalId" TEXT,
    "category" "ResourceCategory" NOT NULL DEFAULT 'food',
    "changeType" "ResourceUpdateType" NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "ResourceUpdateStatus" NOT NULL DEFAULT 'pending',
    "submittedByEmail" TEXT NOT NULL,
    "submittedByName" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedByEmail" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNote" TEXT,

    CONSTRAINT "ResourceUpdateRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "City_slug_key" ON "City"("slug");

-- CreateIndex
CREATE INDEX "Resource_cityId_idx" ON "Resource"("cityId");

-- CreateIndex
CREATE INDEX "Resource_cityId_category_idx" ON "Resource"("cityId", "category");

-- CreateIndex
CREATE UNIQUE INDEX "Resource_cityId_category_externalId_key" ON "Resource"("cityId", "category", "externalId");

-- CreateIndex
CREATE INDEX "ResourceUpdateRequest_status_submittedAt_idx" ON "ResourceUpdateRequest"("status", "submittedAt");

-- CreateIndex
CREATE INDEX "ResourceUpdateRequest_citySlug_idx" ON "ResourceUpdateRequest"("citySlug");

-- AddForeignKey
ALTER TABLE "Resource" ADD CONSTRAINT "Resource_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResourceUpdateRequest" ADD CONSTRAINT "ResourceUpdateRequest_citySlug_fkey" FOREIGN KEY ("citySlug") REFERENCES "City"("slug") ON DELETE CASCADE ON UPDATE CASCADE;
