import { useEffect, useMemo, useState } from "react";
import { sendRoleBasedEmail, type EmailRecipient } from "@/api/emails";
import { ManagerStudentsSection } from "@/components/dashboard/manager/ManagerStudentsSection";
import { StudentDetailDialog } from "@/components/dashboard/manager/StudentDetailDialog";
import { EmailComposerDialog } from "@/components/dashboard/EmailComposerDialog";
import { useManagerProgrammes, useManagerProgrammeDetail } from "@/hooks/manager/useManagerProgrammes";
import { useToast } from "@/hooks/use-toast";

export default function ManagerStudentsPage() {
  const { toast } = useToast();
  const { programmesQuery } = useManagerProgrammes();
  const programmes = programmesQuery.data || [];

  const [selectedProgrammeId, setSelectedProgrammeId] = useState("");
  const [studentSearch, setStudentSearch] = useState("");
  const [selectedEmailStudentIds, setSelectedEmailStudentIds] = useState<string[]>([]);
  const [studentDetailId, setStudentDetailId] = useState<string | null>(null);
  const [showStudentDialog, setShowStudentDialog] = useState(false);
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);

  useEffect(() => {
    if (!selectedProgrammeId && programmes[0]) {
      setSelectedProgrammeId(programmes[0].id);
    }
  }, [programmes, selectedProgrammeId]);

  const { data: selectedProgramme } = useManagerProgrammeDetail(selectedProgrammeId);

  const visibleStudents = selectedProgramme
    ? selectedProgramme.enrollments.filter((enrollment) =>
        `${enrollment.user.name} ${enrollment.user.email} ${enrollment.user.batch || ""} ${enrollment.trackGroup || ""}`
          .toLowerCase()
          .includes(studentSearch.toLowerCase()),
      )
    : [];

  const selectedEmailRecipients = useMemo<EmailRecipient[]>(
    () =>
      (selectedProgramme?.enrollments || [])
        .filter((enrollment) => selectedEmailStudentIds.includes(enrollment.user.id))
        .map((enrollment) => ({ id: enrollment.user.id, name: enrollment.user.name, email: enrollment.user.email })),
    [selectedEmailStudentIds, selectedProgramme],
  );

  const selectedStudentDetail =
    selectedProgramme?.enrollments.find((enrollment) => enrollment.user.id === studentDetailId) || null;

  const handleSendEmail = async (payload: {
    subject: string;
    body: string;
    cc: string;
    bcc: string;
    attachments: File[];
  }) => {
    if (!selectedEmailRecipients.length) {
      toast({
        title: "No recipients selected",
        description: "Select at least one scholar before sending.",
        variant: "destructive",
      });
      return;
    }

    try {
      setSendingEmail(true);
      await sendRoleBasedEmail({
        userIds: selectedEmailRecipients.map((recipient) => recipient.id),
        subject: payload.subject,
        body: payload.body,
        cc: payload.cc,
        bcc: payload.bcc,
        attachments: payload.attachments,
      });
      setShowEmailDialog(false);
      toast({
        title: "Email sent",
        description: `Sent to ${selectedEmailRecipients.length} recipient${selectedEmailRecipients.length === 1 ? "" : "s"}.`,
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
      <ManagerStudentsSection
        programmes={programmes}
        selectedProgrammeId={selectedProgrammeId}
        onSelectedProgrammeIdChange={(value) => {
          setSelectedProgrammeId(value);
          setStudentSearch("");
        }}
        selectedProgramme={selectedProgramme ?? null}
        studentSearch={studentSearch}
        onStudentSearchChange={setStudentSearch}
        visibleStudents={visibleStudents}
        selectedEmailStudentIds={selectedEmailStudentIds}
        onSelectAll={() =>
          setSelectedEmailStudentIds((selectedProgramme?.enrollments || []).map((enrollment) => enrollment.user.id))
        }
        onSelectVisible={() => setSelectedEmailStudentIds(visibleStudents.map((enrollment) => enrollment.user.id))}
        onClearSelection={() => setSelectedEmailStudentIds([])}
        onToggleEmailStudent={(userId) =>
          setSelectedEmailStudentIds((current) =>
            current.includes(userId) ? current.filter((id) => id !== userId) : [...current, userId],
          )
        }
        onProceedToEmail={() => {
          if (!selectedEmailRecipients.length) {
            toast({
              title: "No scholars selected",
              description: "Select one or more scholars before proceeding to email.",
              variant: "destructive",
            });
            return;
          }
          setShowEmailDialog(true);
        }}
        canProceedToEmail={selectedEmailRecipients.length > 0}
        onOpenStudentDetail={(userId) => {
          setStudentDetailId(userId);
          setShowStudentDialog(true);
        }}
      />

      <StudentDetailDialog
        open={showStudentDialog}
        onOpenChange={setShowStudentDialog}
        selectedStudentDetail={selectedStudentDetail}
        selectedProgramme={selectedProgramme ?? null}
      />

      <EmailComposerDialog
        open={showEmailDialog}
        onOpenChange={setShowEmailDialog}
        recipients={selectedEmailRecipients}
        recipientLabel={`${selectedEmailRecipients.length} selected scholar${selectedEmailRecipients.length === 1 ? "" : "s"}`}
        sending={sendingEmail}
        onSend={handleSendEmail}
      />
    </>
  );
}
