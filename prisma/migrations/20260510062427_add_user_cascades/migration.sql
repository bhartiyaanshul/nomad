-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Expense" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tripId" TEXT NOT NULL,
    "payerId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "currency" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "paidAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "stopId" TEXT,
    "activityId" TEXT,
    "splitMode" TEXT NOT NULL DEFAULT 'equal',
    CONSTRAINT "Expense_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Expense_payerId_fkey" FOREIGN KEY ("payerId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Expense" ("activityId", "amount", "category", "currency", "description", "id", "paidAt", "payerId", "splitMode", "stopId", "tripId") SELECT "activityId", "amount", "category", "currency", "description", "id", "paidAt", "payerId", "splitMode", "stopId", "tripId" FROM "Expense";
DROP TABLE "Expense";
ALTER TABLE "new_Expense" RENAME TO "Expense";
CREATE INDEX "Expense_tripId_idx" ON "Expense"("tripId");
CREATE TABLE "new_ExpenseShare" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "expenseId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tripMemberId" TEXT,
    "shareAmount" REAL NOT NULL,
    "settled" BOOLEAN NOT NULL DEFAULT false,
    "settledAt" DATETIME,
    CONSTRAINT "ExpenseShare_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "Expense" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ExpenseShare_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ExpenseShare_tripMemberId_fkey" FOREIGN KEY ("tripMemberId") REFERENCES "TripMember" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_ExpenseShare" ("expenseId", "id", "settled", "settledAt", "shareAmount", "tripMemberId", "userId") SELECT "expenseId", "id", "settled", "settledAt", "shareAmount", "tripMemberId", "userId" FROM "ExpenseShare";
DROP TABLE "ExpenseShare";
ALTER TABLE "new_ExpenseShare" RENAME TO "ExpenseShare";
CREATE INDEX "ExpenseShare_expenseId_idx" ON "ExpenseShare"("expenseId");
CREATE INDEX "ExpenseShare_userId_idx" ON "ExpenseShare"("userId");
CREATE TABLE "new_Note" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tripId" TEXT NOT NULL,
    "stopId" TEXT,
    "authorId" TEXT NOT NULL,
    "day" INTEGER,
    "title" TEXT,
    "content" TEXT NOT NULL,
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Note_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Note_stopId_fkey" FOREIGN KEY ("stopId") REFERENCES "Stop" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Note_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Note" ("authorId", "content", "createdAt", "day", "id", "pinned", "stopId", "title", "tripId", "updatedAt") SELECT "authorId", "content", "createdAt", "day", "id", "pinned", "stopId", "title", "tripId", "updatedAt" FROM "Note";
DROP TABLE "Note";
ALTER TABLE "new_Note" RENAME TO "Note";
CREATE INDEX "Note_tripId_idx" ON "Note"("tripId");
CREATE TABLE "new_PlaceCandidate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "blendGroupId" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "proposedById" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PlaceCandidate_blendGroupId_fkey" FOREIGN KEY ("blendGroupId") REFERENCES "BlendGroup" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PlaceCandidate_proposedById_fkey" FOREIGN KEY ("proposedById") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_PlaceCandidate" ("blendGroupId", "city", "country", "createdAt", "id", "proposedById", "reason") SELECT "blendGroupId", "city", "country", "createdAt", "id", "proposedById", "reason" FROM "PlaceCandidate";
DROP TABLE "PlaceCandidate";
ALTER TABLE "new_PlaceCandidate" RENAME TO "PlaceCandidate";
CREATE INDEX "PlaceCandidate_blendGroupId_idx" ON "PlaceCandidate"("blendGroupId");
CREATE TABLE "new_Todo" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tripId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "category" TEXT,
    "dueAt" DATETIME NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'normal',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "aiGenerated" BOOLEAN NOT NULL DEFAULT false,
    "aiSuggestedReason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Todo_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Todo_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Todo" ("aiGenerated", "aiSuggestedReason", "category", "content", "createdAt", "dueAt", "id", "priority", "status", "tripId", "userId") SELECT "aiGenerated", "aiSuggestedReason", "category", "content", "createdAt", "dueAt", "id", "priority", "status", "tripId", "userId" FROM "Todo";
DROP TABLE "Todo";
ALTER TABLE "new_Todo" RENAME TO "Todo";
CREATE INDEX "Todo_tripId_idx" ON "Todo"("tripId");
CREATE INDEX "Todo_userId_idx" ON "Todo"("userId");
CREATE TABLE "new_TravelMatch" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "personality" TEXT NOT NULL,
    "budgetMin" REAL NOT NULL,
    "budgetMax" REAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "groupSize" INTEGER NOT NULL DEFAULT 2,
    "preferences" TEXT,
    "status" TEXT NOT NULL DEFAULT 'open',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TravelMatch_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_TravelMatch" ("budgetMax", "budgetMin", "createdAt", "currency", "endDate", "groupSize", "id", "personality", "preferences", "region", "startDate", "status", "userId") SELECT "budgetMax", "budgetMin", "createdAt", "currency", "endDate", "groupSize", "id", "personality", "preferences", "region", "startDate", "status", "userId" FROM "TravelMatch";
DROP TABLE "TravelMatch";
ALTER TABLE "new_TravelMatch" RENAME TO "TravelMatch";
CREATE INDEX "TravelMatch_userId_idx" ON "TravelMatch"("userId");
CREATE INDEX "TravelMatch_region_startDate_idx" ON "TravelMatch"("region", "startDate");
CREATE TABLE "new_Trip" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ownerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "coverImageUrl" TEXT,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "totalBudget" REAL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "personality" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "shareSlug" TEXT,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Trip_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Trip" ("coverImageUrl", "createdAt", "currency", "description", "endDate", "id", "isPublic", "name", "ownerId", "personality", "shareSlug", "startDate", "status", "totalBudget", "updatedAt", "viewCount") SELECT "coverImageUrl", "createdAt", "currency", "description", "endDate", "id", "isPublic", "name", "ownerId", "personality", "shareSlug", "startDate", "status", "totalBudget", "updatedAt", "viewCount" FROM "Trip";
DROP TABLE "Trip";
ALTER TABLE "new_Trip" RENAME TO "Trip";
CREATE UNIQUE INDEX "Trip_shareSlug_key" ON "Trip"("shareSlug");
CREATE INDEX "Trip_ownerId_idx" ON "Trip"("ownerId");
CREATE INDEX "Trip_startDate_idx" ON "Trip"("startDate");
CREATE INDEX "Trip_status_idx" ON "Trip"("status");
CREATE TABLE "new_TripMember" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tripId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'traveler',
    "status" TEXT NOT NULL DEFAULT 'active',
    "joinedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TripMember_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TripMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_TripMember" ("id", "joinedAt", "role", "status", "tripId", "userId") SELECT "id", "joinedAt", "role", "status", "tripId", "userId" FROM "TripMember";
DROP TABLE "TripMember";
ALTER TABLE "new_TripMember" RENAME TO "TripMember";
CREATE INDEX "TripMember_userId_idx" ON "TripMember"("userId");
CREATE UNIQUE INDEX "TripMember_tripId_userId_key" ON "TripMember"("tripId", "userId");
CREATE TABLE "new_Vote" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "candidateId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tripMemberId" TEXT,
    "weight" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Vote_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "PlaceCandidate" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Vote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Vote_tripMemberId_fkey" FOREIGN KEY ("tripMemberId") REFERENCES "TripMember" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Vote" ("candidateId", "createdAt", "id", "tripMemberId", "userId", "weight") SELECT "candidateId", "createdAt", "id", "tripMemberId", "userId", "weight" FROM "Vote";
DROP TABLE "Vote";
ALTER TABLE "new_Vote" RENAME TO "Vote";
CREATE UNIQUE INDEX "Vote_candidateId_userId_key" ON "Vote"("candidateId", "userId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
