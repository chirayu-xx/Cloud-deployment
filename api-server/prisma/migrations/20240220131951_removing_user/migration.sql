/*
  Warnings:

  - You are about to drop the column `created_by` on the `Project` table. All the data in the column will be lost.
  - Added the required column `frameWork` to the `Project` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Project" DROP CONSTRAINT "Project_created_by_fkey";

-- AlterTable
ALTER TABLE "Project" DROP COLUMN "created_by",
ADD COLUMN     "frameWork" TEXT NOT NULL;
