import { useEffect, useMemo, useState } from "react";
import { sendRoleBasedEmail, type EmailRecipient } from "@/api/emails";
import {
  downloadInteractiveSessionBulkTemplate,
  downloadProgrammeAssignmentBulkTemplate,
} from "@/api/programmeManager";
import { ManagerEvaluationSection } from "@/components/dashboard/manager/ManagerEvaluationSection";
import { EmailComposerDialog } from "@/components/dashboard/EmailComposerDialog";
import { useManagerProgrammes, useManagerProgrammeDetail } from "@/hooks/manager/useManagerProgrammes";
import { useManagerEvaluation, useManagerSubmissions } from "@/hooks/manager/useManagerEvaluation";
import { useToast } from "@/hooks/use-toast";
import { formatDateTime } from "@/lib/dateFormat";

const getSubmissionPreviewConfig = (fileUrl?: string | null) => {
  if (!fileUrl) return null;

  const normalizedUrl = fileUrl.split("?")[0].toLowerCase();

  if (
    [".pdf", ".png", ".jpg", ".jpeg", ".gif", ".webp", ".txt"].some((ext) => normalizedUrl.endsWith(ext))
  ) {
    return { viewerUrl: fileUrl, openUrl: fileUrl };
  }

  if ([".doc", ".docx", ".ppt", ".pptx", ".xls", ".xlsx"].some((ext) => normalizedUrl.endsWith(ext))) {
    return {
      viewerUrl: `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(fileUrl)}`,
      openUrl: fileUrl,
    };
  }

  return null;
};

export default function ManagerEvaluationPage() {
  const { toast } = useToast();
  const { programmesQuery } = useManagerProgrammes();
  const programmes = programmesQuery.data || [];

  const [selectedProgrammeId, setSelectedProgrammeId] = useState("");
  const [selectedAssignmentId, setSelectedAssignmentId] = useState("");
  const [evaluationSearch, setEvaluationSearch] = useState("");
  const [evaluationFilter, setEvaluationFilter] = useState("all");
  const [scoreDrafts, setScoreDrafts] = useState<Record<string, string>>({});
  const [attendanceDrafts, setAttendanceDrafts] = useState<Record<string, "present" | "absent">>({});
  const [attendanceScoreDrafts, setAttendanceScoreDrafts] = useState<Record<string, string>>({});
  const [selectedEvaluationOccurrenceId, setSelectedEvaluationOccurrenceId] = useState("");
  const [bulkEvaluationProcessing, setBulkEvaluationProcessing] = useState(false);
  const [previewFile, setPreviewFile] = useState<{ viewerUrl: string; openUrl: string; title: string } | null>(
    null,
  );
  const [emailRecipients, setEmailRecipients] = useState<EmailRecipient[]>([]);
  const [emailRecipientLabel, setEmailRecipientLabel] = useState("selected scholars");
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);

  useEffect(() => {
    if (!selectedProgrammeId && programmes[0]) {
      setSelectedProgrammeId(programmes[0].id);
    }
  }, [programmes, selectedProgrammeId]);

  const { data: selectedProgramme } = useManagerProgrammeDetail(selectedProgrammeId);

  const selectedAssignmentType = selectedAssignmentId.startsWith("session:")
    ? "session"
    : selectedAssignmentId.startsWith("assignment:")
      ? "assignment"
      : "";
  const selectedAssignmentKey =
    selectedAssignmentType === "assignment" ? selectedAssignmentId.replace("assignment:", "") : "";
  const selectedSessionKey =
    selectedAssignmentType === "session" ? selectedAssignmentId.replace("session:", "") : "";

  const selectedAssignments = useMemo(() => selectedProgramme?.assignments || [], [selectedProgramme]);
  const selectedInteractiveSessions = useMemo(
    () => selectedProgramme?.interactiveSessions || [],
    [selectedProgramme],
  );

  const { data: submissions = [] } = useManagerSubmissions(
    selectedAssignmentType === "assignment" ? selectedProgrammeId : "",
    selectedAssignmentKey,
  );

  const { evaluateSubmission, saveSessionAttendance, bulkEvaluateAssignment, bulkEvaluateSession } =
    useManagerEvaluation(selectedProgrammeId);

  const selectedEvaluationSession =
    selectedInteractiveSessions.find((session) => session.id === selectedSessionKey) || null;
  const selectedEvaluationOccurrence = useMemo(
    () =>
      selectedEvaluationSession?.occurrences.find((occurrence) => occurrence.id === selectedEvaluationOccurrenceId) ||
      null,
    [selectedEvaluationOccurrenceId, selectedEvaluationSession],
  );
  const isSelectedEvaluationOccurrenceOpen = useMemo(() => {
    if (!selectedEvaluationOccurrence) return false;
    return new Date(selectedEvaluationOccurrence.scheduledAt).getTime() <= Date.now();
  }, [selectedEvaluationOccurrence]);
  const selectedEvaluationAudience = useMemo(() => {
    if (!selectedProgramme || !selectedEvaluationOccurrence) return [];
    const assignedUserIds = new Set(selectedEvaluationOccurrence.assignments.map((assignment) => assignment.userId));
    return selectedProgramme.enrollments.filter((enrollment) => assignedUserIds.has(enrollment.user.id));
  }, [selectedEvaluationOccurrence, selectedProgramme]);

  useEffect(() => {
    setSelectedAssignmentId((current) => {
      if (
        selectedAssignments.some((assignment) => `assignment:${assignment.id}` === current) ||
        selectedInteractiveSessions.some((session) => `session:${session.id}` === current)
      ) {
        return current;
      }
      return "";
    });
  }, [selectedAssignments, selectedInteractiveSessions]);

  useEffect(() => {
    setSelectedEvaluationOccurrenceId((current) => {
      if (current && selectedEvaluationSession?.occurrences.some((occurrence) => occurrence.id === current)) {
        return current;
      }
      return selectedEvaluationSession?.occurrences[0]?.id || "";
    });
  }, [selectedEvaluationSession]);

  useEffect(() => {
    if (!selectedProgramme || !selectedEvaluationSession || !selectedEvaluationOccurrence) return;

    setAttendanceDrafts(
      Object.fromEntries(
        selectedEvaluationAudience.map((enrollment) => {
          const attendance = selectedEvaluationSession.attendances.find(
            (entry) =>
              entry.userId === enrollment.user.id &&
              entry.interactiveSessionOccurrenceId === selectedEvaluationOccurrence.id,
          );
          return [enrollment.user.id, attendance?.status || "present"];
        }),
      ) as Record<string, "present" | "absent">,
    );
    setAttendanceScoreDrafts(
      Object.fromEntries(
        selectedEvaluationAudience.map((enrollment) => {
          const attendance = selectedEvaluationSession.attendances.find(
            (entry) =>
              entry.userId === enrollment.user.id &&
              entry.interactiveSessionOccurrenceId === selectedEvaluationOccurrence.id,
          );
          return [
            enrollment.user.id,
            attendance?.score !== null && attendance?.score !== undefined
              ? String(attendance.score)
              : String(selectedEvaluationSession.maxScore || 0),
          ];
        }),
      ) as Record<string, string>,
    );
  }, [selectedEvaluationAudience, selectedEvaluationOccurrence, selectedEvaluationSession, selectedProgramme]);

  useEffect(() => {
    setScoreDrafts(
      Object.fromEntries(
        submissions.map((submission) => [
          submission.id,
          submission.score !== null && submission.score !== undefined ? String(submission.score) : "",
        ]),
      ),
    );
  }, [submissions]);

  const filteredSubmissions = useMemo(() => {
    return submissions
      .filter((submission) => {
        const matchesSearch =
          !evaluationSearch.trim() ||
          `${submission.student.name} ${submission.student.email}`
            .toLowerCase()
            .includes(evaluationSearch.toLowerCase());

        const matchesFilter =
          evaluationFilter === "all" ||
          (evaluationFilter === "graded" && submission.status === "GRADED") ||
          (evaluationFilter === "under_evaluation" && submission.status === "SUBMITTED");

        return matchesSearch && matchesFilter;
      })
      .map((submission) => {
        const matchingEnrollment = selectedProgramme?.enrollments.find(
          (enrollment) => enrollment.user.id === submission.student.id,
        );

        return {
          ...submission,
          student: {
            ...submission.student,
            batch: matchingEnrollment?.user.batch || submission.student.batch || null,
            trackGroup: matchingEnrollment?.trackGroup || null,
          },
        };
      });
  }, [evaluationFilter, evaluationSearch, selectedProgramme, submissions]);

  const filteredSessionStudents = useMemo(() => {
    if (!selectedProgramme || !selectedEvaluationSession || !selectedEvaluationOccurrence) return [];

    return selectedEvaluationAudience
      .filter((enrollment) => {
        const matchesSearch =
          !evaluationSearch.trim() ||
          `${enrollment.user.name} ${enrollment.user.email} ${enrollment.user.batch || ""} ${enrollment.trackGroup || ""}`
            .toLowerCase()
            .includes(evaluationSearch.toLowerCase());

        const attendance = selectedEvaluationSession.attendances.find(
          (entry) =>
            entry.userId === enrollment.user.id &&
            entry.interactiveSessionOccurrenceId === selectedEvaluationOccurrence.id,
        );
        const status = attendanceDrafts[enrollment.user.id] || attendance?.status || "present";
        const matchesFilter =
          evaluationFilter === "all" ||
          (evaluationFilter === "present" && status === "present") ||
          (evaluationFilter === "absent" && status === "absent");

        return matchesSearch && matchesFilter;
      })
      .map((enrollment) => {
        const attendance = selectedEvaluationSession.attendances.find(
          (entry) =>
            entry.userId === enrollment.user.id &&
            entry.interactiveSessionOccurrenceId === selectedEvaluationOccurrence.id,
        );

        return {
          user: { ...enrollment.user, trackGroup: enrollment.trackGroup || null },
          status: attendanceDrafts[enrollment.user.id] || attendance?.status || "present",
          score:
            attendanceDrafts[enrollment.user.id] === "absent"
              ? "0"
              : attendanceScoreDrafts[enrollment.user.id] ??
                (attendance?.score !== null && attendance?.score !== undefined
                  ? String(attendance.score)
                  : String(selectedEvaluationSession.maxScore || 0)),
        };
      });
  }, [
    attendanceDrafts,
    attendanceScoreDrafts,
    evaluationFilter,
    evaluationSearch,
    selectedEvaluationAudience,
    selectedEvaluationOccurrence,
    selectedEvaluationSession,
    selectedProgramme,
  ]);

  const pendingAssignmentRecipients = useMemo<EmailRecipient[]>(() => {
    if (!selectedProgramme || selectedAssignmentType !== "assignment" || !selectedAssignmentKey) return [];

    const submittedStudentIds = new Set(submissions.map((submission) => submission.student.id));
    const selectedAssignment = selectedAssignments.find((assignment) => assignment.id === selectedAssignmentKey);
    const eligibleEnrollments =
      selectedProgramme.groupedDeliveryEnabled && selectedAssignment?.targetTrackGroups?.length
        ? selectedProgramme.enrollments.filter(
            (enrollment) =>
              enrollment.trackGroup && selectedAssignment.targetTrackGroups.includes(enrollment.trackGroup),
          )
        : selectedProgramme.enrollments;

    return eligibleEnrollments
      .filter((enrollment) => !submittedStudentIds.has(enrollment.user.id))
      .map((enrollment) => ({ id: enrollment.user.id, name: enrollment.user.name, email: enrollment.user.email }));
  }, [selectedAssignmentKey, selectedAssignmentType, selectedAssignments, selectedProgramme, submissions]);

  const openEmailDialogForRecipients = (recipients: EmailRecipient[], label: string) => {
    setEmailRecipients(recipients);
    setEmailRecipientLabel(label);
    setShowEmailDialog(true);
  };

  const handleSaveMarks = async (submissionId: string) => {
    const draft = scoreDrafts[submissionId];
    if (draft === undefined || draft.trim() === "") {
      toast({
        title: "Score required",
        description: "Enter a mark before saving the evaluation.",
        variant: "destructive",
      });
      return;
    }

    try {
      await evaluateSubmission.mutateAsync({ submissionId, score: Number(draft) });
      toast({ title: "Marks saved", description: "The scholar submission has been evaluated." });
    } catch {
      // toast handled by mutation's onError
    }
  };

  const handleSaveAttendance = async () => {
    if (!selectedEvaluationSession || !selectedEvaluationOccurrence) return;

    if (!isSelectedEvaluationOccurrenceOpen) {
      toast({
        title: "Evaluation not open yet",
        description: `You can evaluate this session after ${formatDateTime(selectedEvaluationOccurrence.scheduledAt)}.`,
        variant: "destructive",
      });
      return;
    }

    try {
      await saveSessionAttendance.mutateAsync({
        sessionId: selectedEvaluationSession.id,
        occurrenceId: selectedEvaluationOccurrence.id,
        attendance: selectedEvaluationAudience.map((enrollment) => ({
          userId: enrollment.user.id,
          status: attendanceDrafts[enrollment.user.id] || "present",
          score: Number(
            attendanceDrafts[enrollment.user.id] === "absent" ? 0 : attendanceScoreDrafts[enrollment.user.id] || 0,
          ),
        })),
      });
      toast({ title: "Attendance updated", description: "The interactive session attendance has been saved." });
    } catch {
      // toast handled by mutation's onError
    }
  };

  const handleDownloadBulkEvaluationSheet = async () => {
    if (!selectedAssignmentId) {
      toast({
        title: "Select an item first",
        description: "Choose an assignment or interactive session before downloading the sheet.",
        variant: "destructive",
      });
      return;
    }

    if (selectedAssignmentType === "session" && !selectedEvaluationOccurrence) {
      toast({
        title: "Select a session date first",
        description: "Choose which scheduled date you want to evaluate before downloading the sheet.",
        variant: "destructive",
      });
      return;
    }

    if (selectedAssignmentType === "session" && !isSelectedEvaluationOccurrenceOpen) {
      toast({
        title: "Evaluation not open yet",
        description: `This session can be evaluated after ${formatDateTime(selectedEvaluationOccurrence?.scheduledAt)}.`,
        variant: "destructive",
      });
      return;
    }

    try {
      const blob =
        selectedAssignmentType === "session"
          ? await downloadInteractiveSessionBulkTemplate(selectedSessionKey, selectedEvaluationOccurrence?.id || "")
          : await downloadProgrammeAssignmentBulkTemplate(selectedAssignmentKey);

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download =
        selectedAssignmentType === "session"
          ? `${selectedEvaluationSession?.title || "interactive-session"}-marks-template.xlsx`
          : `${submissions[0]?.assignment.title || "assignment"}-marks-template.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast({
        title: "Unable to download marks sheet",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleUploadBulkEvaluationSheet = async (file: File) => {
    if (!selectedAssignmentId || !selectedProgramme) {
      toast({
        title: "Select an item first",
        description: "Choose an assignment or interactive session before uploading marks.",
        variant: "destructive",
      });
      return;
    }

    if (selectedAssignmentType === "session" && !selectedEvaluationOccurrence) {
      toast({
        title: "Select a session date first",
        description: "Choose which scheduled date you want to evaluate before uploading marks.",
        variant: "destructive",
      });
      return;
    }

    if (selectedAssignmentType === "session" && !isSelectedEvaluationOccurrenceOpen) {
      toast({
        title: "Evaluation not open yet",
        description: `This session can be evaluated after ${formatDateTime(selectedEvaluationOccurrence?.scheduledAt)}.`,
        variant: "destructive",
      });
      return;
    }

    try {
      setBulkEvaluationProcessing(true);

      if (selectedAssignmentType === "session") {
        await bulkEvaluateSession.mutateAsync({
          sessionId: selectedSessionKey,
          occurrenceId: selectedEvaluationOccurrence?.id || "",
          file,
        });
        toast({
          title: "Session marks updated",
          description: "The uploaded sheet has been applied to present scholars.",
        });
      } else {
        await bulkEvaluateAssignment.mutateAsync({ assignmentId: selectedAssignmentKey, file });
        toast({
          title: "Assignment marks updated",
          description: "The uploaded sheet has been applied to submitted scholars.",
        });
      }
    } catch {
      // toast handled by mutation's onError
    } finally {
      setBulkEvaluationProcessing(false);
    }
  };

  const handleSendManagerEmail = async (payload: {
    subject: string;
    body: string;
    cc: string;
    bcc: string;
    attachments: File[];
  }) => {
    if (!emailRecipients.length) {
      toast({
        title: "No recipients selected",
        description: "Choose at least one scholar before sending.",
        variant: "destructive",
      });
      return;
    }

    try {
      setSendingEmail(true);
      await sendRoleBasedEmail({
        userIds: emailRecipients.map((recipient) => recipient.id),
        subject: payload.subject,
        body: payload.body,
        cc: payload.cc,
        bcc: payload.bcc,
        attachments: payload.attachments,
      });
      setShowEmailDialog(false);
      toast({
        title: "Email sent",
        description: `Sent to ${emailRecipients.length} recipient${emailRecipients.length === 1 ? "" : "s"}.`,
      });
    } catch (error) {
      toast({
        title: "Unable to send email",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSendingEmail(false);
    }
  };

  return (
    <>
      <ManagerEvaluationSection
        programmes={programmes}
        selectedProgrammeId={selectedProgrammeId}
        onSelectedProgrammeChange={(value) => {
          setSelectedProgrammeId(value);
          setSelectedAssignmentId("");
          setEvaluationSearch("");
          setEvaluationFilter("all");
        }}
        selectedAssignmentId={selectedAssignmentId}
        onSelectedAssignmentChange={(value) => {
          setSelectedAssignmentId(value);
          setEvaluationSearch("");
          setEvaluationFilter("all");
        }}
        selectedAssignments={selectedAssignments}
        selectedInteractiveSessions={selectedInteractiveSessions}
        selectedAssignmentType={selectedAssignmentType}
        evaluationSearch={evaluationSearch}
        onEvaluationSearchChange={setEvaluationSearch}
        evaluationFilter={evaluationFilter}
        onEvaluationFilterChange={setEvaluationFilter}
        filteredSubmissions={filteredSubmissions}
        filteredSessionStudents={filteredSessionStudents}
        selectedEvaluationSession={selectedEvaluationSession}
        selectedEvaluationOccurrence={selectedEvaluationOccurrence}
        isSelectedEvaluationOccurrenceOpen={isSelectedEvaluationOccurrenceOpen}
        onSelectedEvaluationOccurrenceChange={setSelectedEvaluationOccurrenceId}
        scoreDrafts={scoreDrafts}
        onScoreDraftChange={(submissionId, value) =>
          setScoreDrafts((current) => ({ ...current, [submissionId]: value }))
        }
        onSaveMarks={(submissionId) => void handleSaveMarks(submissionId)}
        onOpenSubmissionFile={(submission) => {
          if (submission.assignment.assignmentType === "document" && submission.fileUrl) {
            const previewConfig = getSubmissionPreviewConfig(submission.fileUrl);

            if (previewConfig) {
              setPreviewFile({
                viewerUrl: previewConfig.viewerUrl,
                openUrl: previewConfig.openUrl,
                title: `${submission.student.name} | ${submission.assignment.title}`,
              });
              return;
            }
          }

          if (submission.fileUrl) {
            const link = document.createElement("a");
            link.href = submission.fileUrl;
            link.target = "_blank";
            link.rel = "noreferrer";
            link.download = "";
            document.body.appendChild(link);
            link.click();
            link.remove();
          }
        }}
        onEmailPendingAssignments={() => {
          if (!pendingAssignmentRecipients.length) {
            toast({
              title: "No pending scholars",
              description: "Everyone has already submitted for this assignment.",
              variant: "destructive",
            });
            return;
          }
          openEmailDialogForRecipients(
            pendingAssignmentRecipients,
            `${pendingAssignmentRecipients.length} scholar${pendingAssignmentRecipients.length === 1 ? "" : "s"} who have not submitted yet`,
          );
        }}
        onEmailVisibleScholars={() => {
          const recipients =
            selectedAssignmentType === "session"
              ? filteredSessionStudents.map((entry) => ({
                  id: entry.user.id,
                  name: entry.user.name,
                  email: entry.user.email,
                }))
              : filteredSubmissions.map((submission) => ({
                  id: submission.student.id,
                  name: submission.student.name,
                  email: submission.student.email,
                }));
          openEmailDialogForRecipients(recipients, "currently visible scholars");
        }}
        onDownloadBulkSheet={() => void handleDownloadBulkEvaluationSheet()}
        onUploadBulkSheet={(file) => void handleUploadBulkEvaluationSheet(file)}
        bulkProcessing={bulkEvaluationProcessing}
        attendanceSessionMaxScore={selectedEvaluationSession?.maxScore || 0}
        onSessionStatusChange={(userId, status) => {
          setAttendanceDrafts((current) => ({ ...current, [userId]: status }));
          setAttendanceScoreDrafts((current) => ({
            ...current,
            [userId]: status === "absent" ? "0" : current[userId] || String(selectedEvaluationSession?.maxScore || 0),
          }));
        }}
        onSessionScoreChange={(userId, value) =>
          setAttendanceScoreDrafts((current) => ({ ...current, [userId]: value }))
        }
        onSaveSessionEvaluation={() => void handleSaveAttendance()}
        formatDateTime={formatDateTime}
        previewFile={previewFile}
        onPreviewFileChange={setPreviewFile}
      />

      <EmailComposerDialog
        open={showEmailDialog}
        onOpenChange={setShowEmailDialog}
        recipients={emailRecipients}
        recipientLabel={emailRecipientLabel}
        sending={sendingEmail}
        onSend={handleSendManagerEmail}
      />
    </>
  );
}
