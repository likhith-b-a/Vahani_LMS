const normalizeStringArray = (values) =>
  Array.isArray(values)
    ? values
        .map((value) => String(value || "").trim())
        .filter(Boolean)
    : [];

const hasGroupedDelivery = (programme) => !!programme?.groupedDeliveryEnabled;

const getProgrammeTrackGroups = (programme) =>
  normalizeStringArray(programme?.groupTrackGroups);

const getProgrammeSessionSlots = (programme) =>
  normalizeStringArray(programme?.groupSessionSlots);

const getEnrollmentTrackGroup = (enrollment) =>
  enrollment?.trackGroup ? String(enrollment.trackGroup).trim() : "";

const getAssignmentTargetTrackGroups = (assignment) =>
  normalizeStringArray(assignment?.targetTrackGroups);

const assignmentAppliesToEnrollment = (assignment, enrollment, programme = null) => {
  if (!hasGroupedDelivery(programme || assignment?.programme)) {
    return true;
  }

  const targetTrackGroups = getAssignmentTargetTrackGroups(assignment);
  if (targetTrackGroups.length === 0) {
    return true;
  }

  const trackGroup = getEnrollmentTrackGroup(enrollment);
  return !!trackGroup && targetTrackGroups.includes(trackGroup);
};

const getSessionOccurrences = (session) =>
  Array.isArray(session?.occurrences) ? session.occurrences : [];

const getAssignedOccurrenceForUser = (session, userId) => {
  const occurrences = getSessionOccurrences(session);
  const assignedOccurrence =
    occurrences.find((occurrence) =>
      (occurrence.assignments || []).some((assignment) => assignment.userId === userId),
    ) || null;

  if (assignedOccurrence) {
    return assignedOccurrence;
  }

  const userAttendances = (session?.attendances || []).filter(
    (entry) => entry.userId === userId,
  );

  const attendanceLinkedOccurrence =
    userAttendances.length > 0
      ? occurrences.find((occurrence) =>
          userAttendances.some(
            (entry) => entry.interactiveSessionOccurrenceId === occurrence.id,
          ),
        ) || null
      : null;

  if (attendanceLinkedOccurrence) {
    return attendanceLinkedOccurrence;
  }

  if (occurrences.length === 1 && userAttendances.length > 0) {
    return occurrences[0];
  }

  return null;
};

const sessionAppliesToEnrollment = (session, enrollment) =>
  !!(enrollment?.userId && getAssignedOccurrenceForUser(session, enrollment.userId));

const filterAssignmentsForEnrollment = (assignments, enrollment, programme = null) =>
  (assignments || []).filter((assignment) =>
    assignmentAppliesToEnrollment(assignment, enrollment, programme),
  );

const serializeSessionForEnrollment = (session, enrollment) => {
  const assignedOccurrence = getAssignedOccurrenceForUser(session, enrollment?.userId);
  if (!assignedOccurrence) {
    return null;
  }

  const userAttendances = (session.attendances || []).filter(
    (entry) => entry.userId === enrollment.userId,
  );
  const userAttendance =
    userAttendances.find(
      (entry) => entry.interactiveSessionOccurrenceId === assignedOccurrence.id,
    ) ||
    (getSessionOccurrences(session).length === 1 ? userAttendances[0] || null : null);

  return {
    ...session,
    scheduledAt: assignedOccurrence.scheduledAt,
    durationMinutes: assignedOccurrence.durationMinutes,
    meetingUrl: assignedOccurrence.meetingUrl,
    assignedOccurrence,
    occurrences: [assignedOccurrence],
    attendances: userAttendance ? [userAttendance] : [],
  };
};

const filterSessionsForEnrollment = (sessions, enrollment) =>
  (sessions || [])
    .map((session) => serializeSessionForEnrollment(session, enrollment))
    .filter(Boolean);

const getEligibleEnrollmentsForOccurrence = (enrollments, occurrence) => {
  const assignedUserIds = new Set(
    (occurrence?.assignments || []).map((assignment) => assignment.userId),
  );

  return (enrollments || []).filter((enrollment) =>
    assignedUserIds.has(enrollment.userId),
  );
};

const getApplicableInteractiveSessionTotals = (sessions, enrollment) =>
  filterSessionsForEnrollment(sessions, enrollment).map((session) => ({
    ...session,
    assignedOccurrence:
      session.assignedOccurrence ||
      getAssignedOccurrenceForUser(session, enrollment?.userId),
  }));

export {
  assignmentAppliesToEnrollment,
  filterAssignmentsForEnrollment,
  filterSessionsForEnrollment,
  getApplicableInteractiveSessionTotals,
  getAssignedOccurrenceForUser,
  getAssignmentTargetTrackGroups,
  getEligibleEnrollmentsForOccurrence,
  getEnrollmentTrackGroup,
  getProgrammeTrackGroups,
  getProgrammeSessionSlots,
  getSessionOccurrences,
  hasGroupedDelivery,
  normalizeStringArray,
  sessionAppliesToEnrollment,
};
