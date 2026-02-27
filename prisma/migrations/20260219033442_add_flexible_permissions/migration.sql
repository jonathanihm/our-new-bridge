-- CreateEnum
CREATE TYPE "AdminRole" AS ENUM ('super_admin', 'city_admin', 'local_admin');

-- CreateEnum
CREATE TYPE "AdminScopeType" AS ENUM ('global', 'city', 'location');

-- CreateTable
CREATE TABLE "AdminRoleAssignment" (
    "id" TEXT NOT NULL,
    "userEmail" TEXT NOT NULL,
    "role" "AdminRole" NOT NULL,
    "scopeType" "AdminScopeType" NOT NULL DEFAULT 'global',
    "citySlug" TEXT,
    "locationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminRoleAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AdminRoleAssignment_userEmail_idx" ON "AdminRoleAssignment"("userEmail");

-- CreateIndex
CREATE INDEX "AdminRoleAssignment_userEmail_role_idx" ON "AdminRoleAssignment"("userEmail", "role");

-- CreateIndex
CREATE INDEX "AdminRoleAssignment_citySlug_idx" ON "AdminRoleAssignment"("citySlug");

-- CreateIndex
CREATE INDEX "AdminRoleAssignment_citySlug_locationId_idx" ON "AdminRoleAssignment"("citySlug", "locationId");

-- CreateIndex
CREATE UNIQUE INDEX "AdminRoleAssignment_userEmail_role_scopeType_citySlug_locationI_key" ON "AdminRoleAssignment"("userEmail", "role", "scopeType", "citySlug", "locationId");

-- AddForeignKey
ALTER TABLE "AdminRoleAssignment" ADD CONSTRAINT "AdminRoleAssignment_citySlug_fkey" FOREIGN KEY ("citySlug") REFERENCES "City"("slug") ON DELETE CASCADE ON UPDATE CASCADE;
