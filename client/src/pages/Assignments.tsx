import { useEffect, useMemo, useState } from "react";
import {
  addDays,
  format,
  formatDistanceStrict,
  formatDistanceToNowStrict,
  isBefore,
  isWithinInterval,
} from "date-fns";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  Clock,
  FileText,
  RefreshCw,
  Upload,
} from "lucide-react";
import { AppSidebar } from "../components/dashboard/AppSidebar";
import { TopNavbar } from "../components/dashboard/TopNavbar";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Skeleton } from "../components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Textarea } from "../components/ui/textarea";
import { getAssignmentsByProgramme, type ProgrammeAssignment, type UserAssignment } from "../api/assignments";
import { getProgrammeDetail } from "../api/programmes";
import { useAssignments } from "../contexts/AssignmentsContext";
import { useToast } from "../hooks/use-toast";
import { useSearchParams } from "react-router-dom";

type EnrichedAssignment = UserAssignment & {
  programmeId: string;
};

type ProgrammeDetail = {
  id: string;
  title: string;
  description: string;
  programmeManager?: {
    name: string;
    email: string;
  };
};

function getAssignmentBadge(assignment: EnrichedAssignment) {
  const dueDate = new Date(assignment.dueDate);

  if (assignment.status !== "PENDING") {
    return {
      label: assignment.status === "GRADED" ? "Graded" : "Submitted",
      className:
        assignment.status === "GRADED"
          ? "bg-green-500/15 text-green-600 border-green-500/30"
          : "bg-blue-500/15 text-blue-600 border-blue-500/30",
    };
  }

  if (isBefore(dueDate, new Date())) {
    return {
      label: "Overdue",
      className: "bg-red-500/15 text-red-600 border-red-500/30",
    };
  }

  if (isWithinInterval(dueDate, { start: new Date(), end: addDays(new Date(), 3) })) {
    return {
      label: "Due Soon",
      className: "bg-yellow-500/15 text-yellow-700 border-yellow-500/30",
    };
  }

  return {
    label: "Open",
    className: "bg-primary/10 text-primary border-primary/20",
  };
}

function mergeProgrammeAssignments(
  programmeAssignments: ProgrammeAssignment[],
  fallbackAssignments: UserAssignment[],
): EnrichedAssignment[] {
  const assignmentMap = new Map(
    fallbackAssignments.map((assignment) => [assignment.id, assignment]),
  );

  return programmeAssignments.map((assignment) => {
    const existing = assignmentMap.get(assignment.id);

    return {
      id: assignment.id,
      title: assignment.title,
      description: assignment.description,
      dueDate: assignment.dueDate,
      maxScore: assignment.maxScore,
      assignmentType: assignment.assignmentType,
      acceptedFileTypes: assignment.acceptedFileTypes,
      programme: existing?.programme || {
        id: assignment.programmeId,
        title: "Programme",
      },
      submission: existing?.submission || null,
      status: existing?.status || "PENDING",
      programmeId: assignment.programmeId,
    };
  });
}

function getSubmissionTimingMeta(assignment: EnrichedAssignment) {
  if (!assignment.submission?.submittedAt) {
    return null;
  }

  const dueDate = new Date(assignment.dueDate);
  const submittedAt = new Date(assignment.submission.submittedAt);

  if (Number.isNaN(dueDate.getTime()) || Number.isNaN(submittedAt.getTime())) {
    return null;
  }

  const diffLabel = formatDistanceStrict(submittedAt, dueDate);

  if (submittedAt.getTime() > dueDate.getTime()) {
    return {
      label: `Overdue by ${diffLabel}`,
      className: "bg-red-500/15 text-red-600 border-red-500/30",
    };
  }

  return {
    label: `Submitted ${diffLabel} early`,
    className: "bg-green-500/15 text-green-600 border-green-500/30",
  };
}

function AssignmentCard({
  assignment,
  onSubmit,
}: {
  assignment: EnrichedAssignment;
  onSubmit: (assignment: EnrichedAssignment) => void;
}) {
  const badge = getAssignmentBadge(assignment);
  const requiresAttendance = assignment.assignmentType === "interactive_session";
  const submissionTiming = getSubmissionTimingMeta(assignment);

  return (
    <Card className="border-border/80">
      <CardContent className="p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-semibold text-foreground">
                {assignment.title}
              </h3>
              <Badge className={badge.className}>{badge.label}</Badge>
              <Badge variant="outline" className="capitalize">
                {assignment.assignmentType}
              </Badge>
              {submissionTiming ? (
                <Badge className={submissionTiming.className}>{submissionTiming.label}</Badge>
              ) : null}
            </div>

            <p className="text-sm text-muted-foreground">
              {assignment.description}
            </p>

            <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">
              <span className="font-medium text-foreground/80">
                {assignment.programme.title}
              </span>
              <span>Due {format(new Date(assignment.dueDate), "dd MMM yyyy, hh:mm a")}</span>
              <span>Max score {assignment.maxScore}</span>
              {!requiresAttendance && (
                <span>
                  Accepts {assignment.acceptedFileTypes.join(", ")}
                </span>
              )}
              {requiresAttendance && (
                <span>Attendance is marked by your programme manager</span>
              )}
              {assignment.status === "PENDING" && (
                <span>
                  {formatDistanceToNowStrict(new Date(assignment.dueDate), {
                    addSuffix: true,
                  })}
                </span>
              )}
              {assignment.submission?.submittedAt && (
                <span>
                  Last submission{" "}
                  {format(new Date(assignment.submission.submittedAt), "dd MMM yyyy, hh:mm a")}
                </span>
              )}
              {assignment.submission?.score !== null &&
                assignment.submission?.score !== undefined && (
                  <span className="font-semibold text-foreground">
                    Score {assignment.submission.score}/{assignment.maxScore}
                  </span>
                )}
            </div>

            {assignment.submission?.fileUrl && (
              <a
                href={assignment.submission.fileUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-primary underline-offset-4 hover:underline break-all"
              >
                Open latest submission
              </a>
            )}
          </div>

          <div className="flex items-center gap-2">
            {requiresAttendance ? (
              <Button size="sm" variant="outline" disabled>
                Attendance only
              </Button>
            ) : (
              <Button size="sm" onClick={() => onSubmit(assignment)}>
                <Upload className="mr-2 h-4 w-4" />
                {assignment.submission ? "Resubmit" : "Submit"}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Assignments() {
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    assignments,
    loading,
    error,
    refreshAssignments,
    submitAssignment,
    pendingAssignments,
    completedAssignments,
  } = useAssignments();

  const [selectedProgrammeId, setSelectedProgrammeId] = useState(
    searchParams.get("programmeId") || "all",
  );
  const [programmeAssignments, setProgrammeAssignments] = useState<EnrichedAssignment[]>([]);
  const [programmeLoading, setProgrammeLoading] = useState(false);
  const [programmeError, setProgrammeError] = useState<string | null>(null);
  const [programmeDetail, setProgrammeDetail] = useState<ProgrammeDetail | null>(null);
  const [submitModalOpen, setSubmitModalOpen] = useState(false);
  const [activeAssignment, setActiveAssignment] = useState<EnrichedAssignment | null>(null);
  const [submitFile, setSubmitFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submissionNote, setSubmissionNote] = useState("");

  const programmeOptions = useMemo(() => {
    const unique = new Map(
      assignments.map((assignment) => [assignment.programme.id, assignment.programme]),
    );
    return Array.from(unique.values());
  }, [assignments]);

  useEffect(() => {
    const programmeId = searchParams.get("programmeId") || "all";
    setSelectedProgrammeId(programmeId);
  }, [searchParams]);

  useEffect(() => {
    if (selectedProgrammeId === "all") {
      setSearchParams({}, { replace: true });
      return;
    }

    setSearchParams({ programmeId: selectedProgrammeId }, { replace: true });
  }, [selectedProgrammeId, setSearchParams]);

  useEffect(() => {
    if (selectedProgrammeId === "all") {
      setProgrammeAssignments([]);
      setProgrammeDetail(null);
      setProgrammeError(null);
      return;
    }

    let mounted = true;

    const loadProgrammeAssignments = async () => {
      try {
        setProgrammeLoading(true);
        setProgrammeError(null);

        const [assignmentsResponse, programmeResponse] = await Promise.all([
          getAssignmentsByProgramme(selectedProgrammeId),
          getProgrammeDetail(selectedProgrammeId),
        ]);

        if (!mounted) {
          return;
        }

        const programmeData = assignmentsResponse?.data;
        setProgrammeAssignments(
          mergeProgrammeAssignments(
            Array.isArray(programmeData?.assignments) ? programmeData.assignments : [],
            assignments,
          ),
        );
        setProgrammeDetail(programmeResponse?.data || null);
      } catch (err) {
        if (!mounted) {
          return;
        }

        setProgrammeError(
          err instanceof Error
            ? err.message
            : "Failed to load programme assignments",
        );
      } finally {
        if (mounted) {
          setProgrammeLoading(false);
        }
      }
    };

    loadProgrammeAssignments();

    return () => {
      mounted = false;
    };
  }, [assignments, selectedProgrammeId]);

  const visibleAssignments = useMemo<EnrichedAssignment[]>(() => {
    if (selectedProgrammeId !== "all") {
      return programmeAssignments;
    }

    return assignments.map((assignment) => ({
      ...assignment,
      programmeId: assignment.programme.id,
    }));
  }, [assignments, programmeAssignments, selectedProgrammeId]);

  const pending = visibleAssignments.filter((assignment) => assignment.status === "PENDING");
  const completed = visibleAssignments.filter((assignment) => assignment.status !== "PENDING");

  const stats = [
    {
      label: "Total",
      value: visibleAssignments.length,
      icon: ClipboardList,
      className: "bg-primary/10 text-primary",
    },
    {
      label: "Pending",
      value: selectedProgrammeId === "all" ? pendingAssignments.length : pending.length,
      icon: Clock,
      className: "bg-yellow-500/10 text-yellow-600",
    },
    {
      label: "Completed",
      value: selectedProgrammeId === "all" ? completedAssignments.length : completed.length,
      icon: CheckCircle2,
      className: "bg-green-500/10 text-green-600",
    },
  ];

  const handleOpenSubmit = (assignment: EnrichedAssignment) => {
    setActiveAssignment(assignment);
    setSubmitFile(null);
    setSubmissionNote("");
    setSubmitModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!activeAssignment || !submitFile) {
      toast({
        title: "File required",
        description: "Choose a file before submitting the assignment.",
        variant: "destructive",
      });
      return;
    }

    try {
      setSubmitting(true);
      await submitAssignment(activeAssignment.id, submitFile);
      await refreshAssignments();

      toast({
        title: "Assignment submitted",
        description: submissionNote
          ? "Your file was uploaded successfully."
          : "Your latest assignment file was uploaded successfully.",
      });
      setSubmitModalOpen(false);
      setActiveAssignment(null);
      setSubmitFile(null);
      setSubmissionNote("");
    } catch (err) {
      toast({
        title: "Submission failed",
        description:
          err instanceof Error ? err.message : "Unable to submit assignment.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const isBusy = loading || programmeLoading;

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar activePage="Assignments" />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopNavbar />
        <main className="flex-1 space-y-6 p-4 sm:p-6 lg:p-8">
          <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
                Assignments
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Track upcoming work, review submissions, and upload your latest files.
              </p>
            </div>

            <div className="flex w-full flex-col gap-3 sm:flex-row lg:w-auto">
              <Select value={selectedProgrammeId} onValueChange={setSelectedProgrammeId}>
                <SelectTrigger className="w-full sm:w-72">
                  <SelectValue placeholder="Filter by programme" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Programmes</SelectItem>
                  {programmeOptions.map((programme) => (
                    <SelectItem key={programme.id} value={programme.id}>
                      {programme.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button variant="outline" onClick={refreshAssignments}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
            </div>
          </section>

          {programmeDetail && (
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="flex flex-col gap-2 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <FileText className="h-4 w-4 text-primary" />
                  {programmeDetail.title}
                </div>
                <p className="text-sm text-muted-foreground">
                  {programmeDetail.description}
                </p>
                {programmeDetail.programmeManager && (
                  <p className="text-xs text-muted-foreground">
                    Managed by {programmeDetail.programmeManager.name} •{" "}
                    {programmeDetail.programmeManager.email}
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {(error || programmeError) && (
            <Card className="border-destructive/30 bg-destructive/5">
              <CardContent className="flex items-start gap-3 p-4">
                <AlertTriangle className="mt-0.5 h-5 w-5 text-destructive" />
                <div>
                  <p className="font-semibold text-foreground">
                    Could not load assignments
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {programmeError || error}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {stats.map((stat) => (
              <Card key={stat.label}>
                <CardContent className="flex items-center gap-3 p-4">
                  <div className={`rounded-lg p-2 ${stat.className}`}>
                    <stat.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                    <p className="text-xl font-bold text-foreground">{stat.value}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Tabs defaultValue="pending">
            <TabsList>
              <TabsTrigger value="pending">Pending ({pending.length})</TabsTrigger>
              <TabsTrigger value="completed">Completed ({completed.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="pending" className="mt-4 space-y-4">
              {isBusy &&
                Array.from({ length: 3 }).map((_, index) => (
                  <Card key={index}>
                    <CardContent className="space-y-3 p-4">
                      <Skeleton className="h-4 w-44" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-3/4" />
                    </CardContent>
                  </Card>
                ))}

              {!isBusy && pending.length === 0 && (
                <Card>
                  <CardContent className="p-10 text-center text-sm text-muted-foreground">
                    No pending assignments right now.
                  </CardContent>
                </Card>
              )}

              {!isBusy &&
                pending.map((assignment) => (
                  <AssignmentCard
                    key={assignment.id}
                    assignment={assignment}
                    onSubmit={handleOpenSubmit}
                  />
                ))}
            </TabsContent>

            <TabsContent value="completed" className="mt-4 space-y-4">
              {isBusy &&
                Array.from({ length: 2 }).map((_, index) => (
                  <Card key={index}>
                    <CardContent className="space-y-3 p-4">
                      <Skeleton className="h-4 w-40" />
                      <Skeleton className="h-4 w-full" />
                    </CardContent>
                  </Card>
                ))}

              {!isBusy && completed.length === 0 && (
                <Card>
                  <CardContent className="p-10 text-center text-sm text-muted-foreground">
                    No submitted assignments yet.
                  </CardContent>
                </Card>
              )}

              {!isBusy &&
                completed.map((assignment) => (
                  <AssignmentCard
                    key={assignment.id}
                    assignment={assignment}
                    onSubmit={handleOpenSubmit}
                  />
                ))}
            </TabsContent>
          </Tabs>

          <Dialog open={submitModalOpen} onOpenChange={setSubmitModalOpen}>
            <DialogContent className="max-w-[95vw] sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Submit Assignment</DialogTitle>
                <DialogDescription>
                  {activeAssignment?.title} • {activeAssignment?.programme.title}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="rounded-lg border border-dashed border-border p-4">
                  <p className="text-sm font-medium text-foreground">
                    Upload your assignment file
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Allowed files for this assignment:{" "}
                    {activeAssignment?.acceptedFileTypes.join(", ")}
                  </p>
                  <Input
                    className="mt-4"
                    type="file"
                    accept={activeAssignment?.acceptedFileTypes.join(",")}
                    onChange={(event) =>
                      setSubmitFile(event.target.files?.[0] || null)
                    }
                  />
                  {submitFile && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Selected file: {submitFile.name}
                    </p>
                  )}
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-foreground">
                    Submission note
                  </label>
                  <Textarea
                    placeholder="Optional note for your own reference"
                    value={submissionNote}
                    onChange={(event) => setSubmissionNote(event.target.value)}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setSubmitModalOpen(false)}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button onClick={handleSubmit} disabled={submitting}>
                  <Upload className="mr-2 h-4 w-4" />
                  {submitting ? "Submitting..." : "Submit Assignment"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </main>
      </div>
    </div>
  );
}
