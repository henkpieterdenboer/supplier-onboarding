-- Step 1: Add new columns as nullable first
ALTER TABLE "User" ADD COLUMN "firstName" TEXT;
ALTER TABLE "User" ADD COLUMN "middleName" TEXT;
ALTER TABLE "User" ADD COLUMN "lastName" TEXT;
ALTER TABLE "User" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "receiveEmails" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "User" ADD COLUMN "activationToken" TEXT;
ALTER TABLE "User" ADD COLUMN "activationExpiresAt" TIMESTAMP(3);

-- Step 2: Migrate existing name data (split on last space: everything before = firstName, last word = lastName)
UPDATE "User"
SET
  "firstName" = CASE
    WHEN POSITION(' ' IN "name") > 0 THEN LEFT("name", LENGTH("name") - LENGTH(SUBSTRING("name" FROM '[^ ]+$')))
    ELSE "name"
  END,
  "lastName" = CASE
    WHEN POSITION(' ' IN "name") > 0 THEN SUBSTRING("name" FROM '[^ ]+$')
    ELSE ''
  END,
  "isActive" = true;

-- Trim trailing space from firstName
UPDATE "User" SET "firstName" = TRIM("firstName");

-- Step 3: Set NOT NULL constraints now that data exists
ALTER TABLE "User" ALTER COLUMN "firstName" SET NOT NULL;
ALTER TABLE "User" ALTER COLUMN "lastName" SET NOT NULL;

-- Step 4: Make passwordHash nullable
ALTER TABLE "User" ALTER COLUMN "passwordHash" DROP NOT NULL;

-- Step 5: Drop old name column
ALTER TABLE "User" DROP COLUMN "name";

-- Step 6: Create unique index on activationToken
CREATE UNIQUE INDEX "User_activationToken_key" ON "User"("activationToken");
