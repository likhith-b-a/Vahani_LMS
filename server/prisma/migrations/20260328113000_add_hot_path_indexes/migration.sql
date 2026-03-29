CREATE INDEX IF NOT EXISTS "Enrollment_programmeId_idx" ON "Enrollment"("programmeId");
CREATE INDEX IF NOT EXISTS "Enrollment_status_programmeId_idx" ON "Enrollment"("status", "programmeId");

CREATE INDEX IF NOT EXISTS "Assignment_programmeId_dueDate_idx" ON "Assignment"("programmeId", "dueDate");

CREATE INDEX IF NOT EXISTS "ProgrammeResource_programmeId_resourceType_idx" ON "ProgrammeResource"("programmeId", "resourceType");

CREATE INDEX IF NOT EXISTS "InteractiveSession_programmeId_scheduledAt_idx" ON "InteractiveSession"("programmeId", "scheduledAt");
CREATE INDEX IF NOT EXISTS "InteractiveSessionAttendance_userId_idx" ON "InteractiveSessionAttendance"("userId");

CREATE INDEX IF NOT EXISTS "AnnouncementRecipient_userId_idx" ON "AnnouncementRecipient"("userId");
CREATE INDEX IF NOT EXISTS "NotificationRecipient_userId_isRead_idx" ON "NotificationRecipient"("userId", "isRead");

CREATE INDEX IF NOT EXISTS "ProgrammeWishlist_userId_createdAt_idx" ON "ProgrammeWishlist"("userId", "createdAt");

CREATE INDEX IF NOT EXISTS "SupportQuery_assignedToId_status_updatedAt_idx" ON "SupportQuery"("assignedToId", "status", "updatedAt");
CREATE INDEX IF NOT EXISTS "SupportQuery_authorId_status_updatedAt_idx" ON "SupportQuery"("authorId", "status", "updatedAt");
CREATE INDEX IF NOT EXISTS "SupportQuery_programmeId_idx" ON "SupportQuery"("programmeId");
