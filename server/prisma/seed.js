import "dotenv/config";
import bcrypt from "bcrypt";
import db from "../src/db.js";
import { defaultSettings } from "../src/utils/adminSettingsStore.js";
import { getAcceptedFileTypesForAssignmentType } from "../src/utils/assignmentMetadata.js";
import { wishlistSeedEntries } from "./wishlistSeedData.js";

const now = new Date();
const addDays = (days) => new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

const seed = async () => {
  await db.notificationRecipient.deleteMany();
  await db.notification.deleteMany();
  await db.announcementRecipient.deleteMany();
  await db.announcement.deleteMany();
  await db.supportQueryMessage.deleteMany();
  await db.supportQuery.deleteMany();
  await db.certificate.deleteMany();
  await db.programmeWishlist.deleteMany();
  await db.programmeResource.deleteMany();
  await db.interactiveSessionAttendance.deleteMany();
  await db.interactiveSession.deleteMany();
  await db.submission.deleteMany();
  await db.assignment.deleteMany();
  await db.enrollment.deleteMany();
  await db.passwordResetOtp.deleteMany();
  await db.systemSetting.deleteMany();
  await db.programme.deleteMany();
  await db.user.deleteMany();

  const passwordHash = await bcrypt.hash("Password@123", 10);

  await db.user.createMany({
    data: [
      {
        id: "u1",
        name: "Alice Admin",
        email: "alice.admin@lms.com",
        password: passwordHash,
        role: "admin",
        phoneNumber: "9000000001",
      },
      {
        id: "u2",
        name: "Mira Manager",
        email: "mira.manager@lms.com",
        password: passwordHash,
        role: "programme_manager",
        phoneNumber: "9000000002",
      },
      {
        id: "u3",
        name: "Ravi Manager",
        email: "ravi.manager@lms.com",
        password: passwordHash,
        role: "programme_manager",
        phoneNumber: "9000000003",
      },
      {
        id: "u4",
        name: "Nila Scholar",
        email: "nila@lms.com",
        password: passwordHash,
        role: "scholar",
        batch: "2026-A",
        creditsEarned: 6,
        phoneNumber: "9000000004",
      },
      {
        id: "u5",
        name: "Arjun Scholar",
        email: "arjun@lms.com",
        password: passwordHash,
        role: "scholar",
        batch: "2026-A",
        creditsEarned: 2,
        phoneNumber: "9000000005",
      },
      {
        id: "u6",
        name: "Sara Scholar",
        email: "sara@lms.com",
        password: passwordHash,
        role: "scholar",
        batch: "2026-B",
        creditsEarned: 0,
        phoneNumber: "9000000006",
      },
    ],
  });

  await db.programme.createMany({
    data: [
      {
        id: "p1",
        title: "Full Stack Web Dev",
        description: "MERN stack course",
        credits: 6,
        programmeManagerId: "u2",
        selfEnrollmentEnabled: false,
        spotlightTitle: "Project sprint",
        spotlightMessage: "This week focuses on the capstone build.",
      },
      {
        id: "p2",
        title: "Data Structures",
        description: "Foundational DS and problem solving",
        credits: 4,
        programmeManagerId: "u3",
        selfEnrollmentEnabled: false,
        spotlightTitle: "Arrays to trees",
        spotlightMessage: "New reference pack uploaded for traversals.",
      },
      {
        id: "p3",
        title: "English Masterclass",
        description: "Scholar-choice communication programme",
        credits: 2,
        programmeManagerId: "u2",
        selfEnrollmentEnabled: true,
        spotlightTitle: "Open enrolment",
        spotlightMessage: "Scholars can now register directly into English Masterclass.",
      },
    ],
  });

  await db.enrollment.createMany({
    data: [
      {
        id: "e1",
        userId: "u4",
        programmeId: "p1",
        status: "completed",
        progressPercent: 100,
        creditsAwarded: 6,
        completedAt: addDays(-2),
        lastActivityAt: addDays(-2),
      },
      {
        id: "e2",
        userId: "u4",
        programmeId: "p2",
        status: "active",
        progressPercent: 40,
        creditsAwarded: 0,
        lastActivityAt: addDays(-1),
      },
      {
        id: "e3",
        userId: "u5",
        programmeId: "p1",
        status: "active",
        progressPercent: 60,
        creditsAwarded: 0,
        lastActivityAt: addDays(-1),
      },
      {
        id: "e4",
        userId: "u6",
        programmeId: "p2",
        status: "active",
        progressPercent: 15,
        creditsAwarded: 0,
        lastActivityAt: addDays(-1),
      },
    ],
  });

  await db.assignment.createMany({
    data: [
      {
        id: "a1",
        title: "Login Page",
        description: "Build an auth flow with signup and login.",
        dueDate: addDays(4),
        maxScore: 100,
        type: "document",
        acceptedFileTypes: getAcceptedFileTypesForAssignmentType("document"),
        isGraded: true,
        programmeId: "p1",
        createdById: "u2",
      },
      {
        id: "a3",
        title: "Arrays Workbook",
        description: "Solve the worksheet problems and upload your notes.",
        dueDate: addDays(2),
        maxScore: 50,
        type: "document",
        acceptedFileTypes: getAcceptedFileTypesForAssignmentType("document"),
        isGraded: true,
        programmeId: "p2",
        createdById: "u3",
      },
      {
        id: "a4",
        title: "Pronunciation Practice",
        description: "Record and upload a pronunciation drill.",
        dueDate: addDays(7),
        maxScore: 20,
        type: "audio",
        acceptedFileTypes: getAcceptedFileTypesForAssignmentType("audio"),
        isGraded: true,
        programmeId: "p3",
        createdById: "u2",
      },
      {
        id: "a5",
        title: "Weekly Quiz",
        description: "Short comprehension quiz.",
        dueDate: addDays(1),
        maxScore: 10,
        type: "quiz",
        acceptedFileTypes: getAcceptedFileTypesForAssignmentType("quiz"),
        isGraded: true,
        programmeId: "p2",
        createdById: "u3",
      },
    ],
  });

  await db.submission.createMany({
    data: [
      {
        id: "s1",
        assignmentId: "a1",
        userId: "u4",
        fileUrl: "public/uploads/login-page-nila.pdf",
        score: 88,
        feedback: "Strong auth flow and form handling.",
        submittedAt: addDays(-3),
        evaluatedAt: addDays(-2),
        evaluatedById: "u2",
      },
      {
        id: "s2",
        assignmentId: "a1",
        userId: "u5",
        fileUrl: "public/uploads/login-page-arjun.pdf",
        submittedAt: addDays(-1),
      },
      {
        id: "s3",
        assignmentId: "a3",
        userId: "u4",
        fileUrl: "public/uploads/arrays-nila.pdf",
        score: 45,
        feedback: "Good problem breakdown.",
        submittedAt: addDays(-1),
        evaluatedAt: addDays(-1),
        evaluatedById: "u3",
        isLate: false,
      },
      {
        id: "s4",
        assignmentId: "a5",
        userId: "u6",
        fileUrl: "public/uploads/quiz-sara.pdf",
        submittedAt: addDays(3),
        isLate: true,
      },
    ],
  });

  await db.interactiveSession.createMany({
    data: [
      {
        id: "is1",
        programmeId: "p1",
        createdById: "u2",
        title: "Interactive Demo",
        description: "Walk through the deployed demo in a live session.",
        scheduledAt: addDays(-1),
        durationMinutes: 90,
        meetingUrl: "https://meet.example.com/fullstack-demo",
      },
      {
        id: "is2",
        programmeId: "p2",
        createdById: "u3",
        title: "Linked Lists live problem solving",
        description: "Live coding and doubt clearing session.",
        scheduledAt: addDays(3),
        durationMinutes: 60,
        meetingUrl: "https://meet.example.com/data-structures-live",
      },
    ],
  });

  await db.interactiveSessionAttendance.createMany({
    data: [
      {
        id: "isa1",
        interactiveSessionId: "is1",
        userId: "u4",
        status: "present",
      },
      {
        id: "isa2",
        interactiveSessionId: "is1",
        userId: "u5",
        status: "absent",
      },
    ],
  });

  await db.programmeResource.createMany({
    data: [
      {
        id: "r1",
        programmeId: "p1",
        createdById: "u2",
        title: "Capstone checklist",
        description: "Submission checklist for the final web project.",
        resourceType: "study_material",
        url: "https://example.com/capstone-checklist",
      },
      {
        id: "r2",
        programmeId: "p2",
        createdById: "u3",
        title: "Traversal reference sheet",
        description: "Cheat sheet for DFS and BFS patterns.",
        resourceType: "reference_material",
        url: "https://example.com/traversal-sheet",
      },
      {
        id: "r3",
        programmeId: "p1",
        createdById: "u2",
        title: "Mentor office hours",
        resourceType: "meeting_link",
        url: "https://meet.example.com/office-hours",
      },
    ],
  });

  const scholarsByEmail = new Map(
    (
      await db.user.findMany({
        where: {
          email: {
            in: [...new Set(wishlistSeedEntries.map((entry) => entry.userEmail))],
          },
        },
        select: {
          id: true,
          email: true,
        },
      })
    ).map((user) => [user.email.toLowerCase(), user]),
  );

  await db.programmeWishlist.createMany({
    data: wishlistSeedEntries.map((entry, index) => {
      const scholar = scholarsByEmail.get(entry.userEmail.toLowerCase());

      if (!scholar) {
        throw new Error(`Wishlist seed user not found for ${entry.userEmail}`);
      }

      return {
        id: `w${index + 1}`,
        requestedTitle: entry.requestedTitle,
        note: entry.note ?? null,
        userId: scholar.id,
      };
    }),
  });

  await db.certificate.createMany({
    data: [
      {
        id: "c1",
        programmeId: "p1",
        userId: "u4",
        issuedById: "u2",
        title: "Full Stack Web Dev Completion Certificate",
        description: "Awarded for successfully completing the programme.",
        fileUrl: "https://example.com/certificates/u4-p1.pdf",
        status: "available",
      },
    ],
  });

  const announcement = await db.announcement.create({
    data: {
      id: "an1",
      title: "Batch A checkpoint",
      message: "Please review this week's materials before Friday.",
      programmeId: "p1",
      targetBatch: "2026-A",
      createdById: "u2",
      recipients: {
        create: [{ userId: "u4" }, { userId: "u5" }],
      },
    },
  });

  const supportQuery = await db.supportQuery.create({
    data: {
      id: "q1",
      programmeId: "p1",
      authorId: "u5",
      assignedToId: "u2",
      targetType: "programme_manager",
      subject: "Need help with project setup",
      message: "The local environment is not starting correctly.",
      status: "in_progress",
      messages: {
        create: [
          {
            id: "qm1",
            authorId: "u5",
            message: "The local environment is not starting correctly.",
          },
          {
            id: "qm2",
            authorId: "u2",
            message: "Please share the error logs and your environment file keys.",
          },
        ],
      },
    },
  });

  const adminQuery = await db.supportQuery.create({
    data: {
      id: "q2",
      authorId: "u6",
      targetType: "admin",
      subject: "Enrollment correction request",
      message: "Please move me to the 2026-A reporting batch.",
      status: "open",
      messages: {
        create: [
          {
            id: "qm3",
            authorId: "u6",
            message: "Please move me to the 2026-A reporting batch.",
          },
        ],
      },
    },
  });

  const notificationRows = [
    {
      id: "n1",
      type: "programme",
      title: "English Masterclass is now open",
      message: "Scholars can now self-enroll into English Masterclass.",
      actorId: "u1",
      programmeId: "p3",
      actionUrl: "/course-registration",
      recipients: ["u4", "u5", "u6"],
    },
    {
      id: "n2",
      type: "resource",
      title: "New resource in Full Stack Web Dev",
      message: "Capstone checklist",
      actorId: "u2",
      programmeId: "p1",
      actionUrl: "/my-programmes/p1",
      recipients: ["u4", "u5"],
    },
    {
      id: "n3",
      type: "grade",
      title: "Marks updated for Login Page",
      message: "You received 88 out of 100.",
      actorId: "u2",
      programmeId: "p1",
      assignmentId: "a1",
      actionUrl: "/assignments?programmeId=p1",
      recipients: ["u4"],
    },
    {
      id: "n4",
      type: "announcement",
      title: announcement.title,
      message: announcement.message,
      actorId: "u2",
      programmeId: "p1",
      announcementId: announcement.id,
      actionUrl: "/my-programmes/p1",
      recipients: ["u4", "u5"],
    },
    {
      id: "n5",
      type: "certificate",
      title: "Certificate available for Full Stack Web Dev",
      message: "Full Stack Web Dev Completion Certificate",
      actorId: "u2",
      programmeId: "p1",
      actionUrl: "/profile",
      recipients: ["u4"],
    },
    {
      id: "n6",
      type: "query",
      title: "New scholar query",
      message: supportQuery.subject,
      actorId: "u5",
      programmeId: "p1",
      actionUrl: "/dashboard",
      recipients: ["u2"],
    },
    {
      id: "n7",
      type: "meeting",
      title: "Interactive session scheduled in Data Structures",
      message: "Linked Lists live problem solving",
      actorId: "u3",
      programmeId: "p2",
      actionUrl: "/my-programmes/p2",
      recipients: ["u4", "u6"],
    },
    {
      id: "n8",
      type: "query",
      title: "New scholar query",
      message: adminQuery.subject,
      actorId: "u6",
      actionUrl: "/dashboard",
      recipients: ["u1"],
    },
  ];

  for (const notification of notificationRows) {
    await db.notification.create({
      data: {
        id: notification.id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        actorId: notification.actorId,
        programmeId: notification.programmeId || null,
        assignmentId: notification.assignmentId || null,
        announcementId: notification.announcementId || null,
        actionUrl: notification.actionUrl,
        recipients: {
          create: notification.recipients.map((userId) => ({
            userId,
            isRead: notification.id === "n2" && userId === "u4",
            readAt:
              notification.id === "n2" && userId === "u4"
                ? addDays(-1)
                : null,
          })),
        },
      },
    });
  }

  await db.systemSetting.create({
    data: {
      key: "admin",
      value: defaultSettings,
      updatedById: "u1",
    },
  });

  await db.passwordResetOtp.create({
    data: {
      id: "otp1",
      email: "nila@lms.com",
      otpHash: await bcrypt.hash("654321", 10),
      expiresAt: addDays(1),
    },
  });
};

seed()
  .then(async () => {
    await db.$disconnect();
    console.log("Seed completed successfully");
  })
  .catch(async (error) => {
    console.error("Seed failed", error);
    await db.$disconnect();
    process.exit(1);
  });
