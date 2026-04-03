import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, BookOpen, Download, GraduationCap, Plus, Settings2, Users } from "lucide-react";
import {
  assignScholarsToProgramme,
  getAdminProgrammeDetail,
  getAdminUsers,
  processProgrammeEnrollmentRequests,
  removeScholarFromProgramme,
  updateAdminProgramme,
  type AdminProgrammeDetail,
  type AdminUser,
} from "@/api/admin";
import { AdminSidebar } from "@/components/dashboard/AdminSidebar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { exportAdminProgrammeDetailPdf } from "@/lib/adminDetailPdfExport";
import { matchesSelfEnrollmentScholarRules } from "@/lib/selfEnrollmentEligibility";

const formatDate = (value?: string | null) =>
  value
    ? new Date(value).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "--";

export default function AdminProgrammeDetailPage() {
  const { programmeId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [programme, setProgramme] = useState<AdminProgrammeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [scholars, setScholars] = useState<AdminUser[]>([]);
  const [batchFilter, setBatchFilter] = useState("all");
  const [selectedScholarIds, setSelectedScholarIds] = useState<string[]>([]);
  const [processingRequests, setProcessingRequests] = useState(false);
  const [savingRules, setSavingRules] = useState(false);
  const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useState(false);
  const [isRequestsDialogOpen, setIsRequestsDialogOpen] = useState(false);
  const [isAddScholarsDialogOpen, setIsAddScholarsDialogOpen] = useState(false);
  const [selfEnrollmentForm, setSelfEnrollmentForm] = useState({
    enabled: false,
    seatLimit: "",
    opensAt: "",
    closesAt: "",
    allowedBatches: [] as string[],
    allowedGenders: [] as string[],
  });

  const loadProgramme = async () => {
    if (!programmeId) {
      navigate("/admin", { state: { section: "programmes" } });
      return;
    }

    setLoading(true);
    try {
      const response = await getAdminProgrammeDetail(programmeId);
      setProgramme((response.data as AdminProgrammeDetail) || null);
    } catch (error) {
      toast({
        title: "Unable to load programme details",
        description: error instanceof Error ? error.message : "Please try again shortly.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadProgramme();
  }, [programmeId]);

  useEffect(() => {
    const loadScholars = async () => {
      try {
        const response = await getAdminUsers("scholar");
        setScholars(Array.isArray(response?.data?.users) ? (response.data.users as AdminUser[]) : []);
      } catch {
        setScholars([]);
      }
    };

    void loadScholars();
  }, []);

  const batchOptions = useMemo(
    () =>
      Array.from(
        new Set(
          scholars
            .map((scholar) => scholar.batch)
            .filter((batch): batch is string => Boolean(batch)),
        ),
      ).sort(),
    [scholars],
  );

  const genderOptions = useMemo(
    () =>
      Array.from(
        new Set(
          scholars
            .map((scholar) => scholar.gender?.trim())
            .filter((entry): entry is string => Boolean(entry)),
        ),
      ).sort(),
    [scholars],
  );

  const availableScholars = useMemo(() => {
    const enrolledIds = new Set(programme?.enrolledScholars.map((entry) => entry.user.id) || []);
    return scholars.filter((scholar) => {
      if (enrolledIds.has(scholar.id)) return false;
      if (batchFilter !== "all" && scholar.batch !== batchFilter) return false;
      if (
        !matchesSelfEnrollmentScholarRules(scholar, {
          enabled: selfEnrollmentForm.enabled,
          allowedBatches: selfEnrollmentForm.allowedBatches,
          allowedGenders: selfEnrollmentForm.allowedGenders,
        })
      ) {
        return false;
      }
      return true;
    });
  }, [
    batchFilter,
    programme?.enrolledScholars,
    scholars,
    selfEnrollmentForm.allowedBatches,
    selfEnrollmentForm.allowedGenders,
    selfEnrollmentForm.enabled,
  ]);

  useEffect(() => {
    if (!programme) return;
    setSelfEnrollmentForm({
      enabled: programme.selfEnrollmentEnabled,
      seatLimit:
        programme.selfEnrollmentSeatLimit !== null &&
        programme.selfEnrollmentSeatLimit !== undefined
          ? String(programme.selfEnrollmentSeatLimit)
          : "",
      opensAt: programme.selfEnrollmentOpensAt
        ? String(programme.selfEnrollmentOpensAt).slice(0, 16)
        : "",
      closesAt: programme.selfEnrollmentClosesAt
        ? String(programme.selfEnrollmentClosesAt).slice(0, 16)
        : "",
      allowedBatches: programme.selfEnrollmentAllowedBatches || [],
      allowedGenders: programme.selfEnrollmentAllowedGenders || [],
    });
  }, [programme]);

  const handleAddScholars = async () => {
    if (!programmeId || selectedScholarIds.length === 0) return;

    try {
      await assignScholarsToProgramme(programmeId, selectedScholarIds);
      setSelectedScholarIds([]);
      await loadProgramme();
      toast({ title: "Scholars added", description: "Selected scholars were enrolled." });
    } catch (error) {
      toast({
        title: "Unable to add scholars",
        description: error instanceof Error ? error.message : "Please try again shortly.",
        variant: "destructive",
      });
    }
  };

  const handleRemoveScholar = async (scholarId: string) => {
    if (!programmeId) return;

    try {
      await removeScholarFromProgramme(programmeId, scholarId);
      await loadProgramme();
      toast({ title: "Scholar removed", description: "Enrollment was removed." });
    } catch (error) {
      toast({
        title: "Unable to remove scholar",
        description: error instanceof Error ? error.message : "Please try again shortly.",
        variant: "destructive",
      });
    }
  };

  const handleProcessRequests = async () => {
    if (!programmeId) return;

    try {
      setProcessingRequests(true);
      const response = await processProgrammeEnrollmentRequests(programmeId);
      await loadProgramme();
      toast({
        title: "Requests processed",
        description:
          response?.data?.acceptedCount || response?.data?.rejectedCount
            ? `${response.data.acceptedCount} accepted, ${response.data.rejectedCount} rejected.`
            : "There were no pending requests to process.",
      });
    } catch (error) {
      toast({
        title: "Unable to process requests",
        description: error instanceof Error ? error.message : "Please try again shortly.",
        variant: "destructive",
      });
    } finally {
      setProcessingRequests(false);
    }
  };

  const handleSaveRules = async () => {
    if (!programmeId) return;

    try {
      setSavingRules(true);
      await updateAdminProgramme(programmeId, {
        selfEnrollmentEnabled: selfEnrollmentForm.enabled,
        selfEnrollmentSeatLimit:
          selfEnrollmentForm.seatLimit !== "" ? Number(selfEnrollmentForm.seatLimit) : null,
        selfEnrollmentOpensAt: selfEnrollmentForm.opensAt || null,
        selfEnrollmentClosesAt: selfEnrollmentForm.closesAt || null,
        selfEnrollmentAllowedBatches: selfEnrollmentForm.allowedBatches,
        selfEnrollmentAllowedGenders: selfEnrollmentForm.allowedGenders,
      });
      await loadProgramme();
      toast({
        title: "Enrollment settings updated",
        description: "The FCFS request rules for this programme have been saved.",
      });
    } catch (error) {
      toast({
        title: "Unable to save enrollment settings",
        description: error instanceof Error ? error.message : "Please try again shortly.",
        variant: "destructive",
      });
    } finally {
      setSavingRules(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="flex">
        <AdminSidebar
          activeSection="programmes"
          onSelectSection={(section) => navigate("/admin", { state: { section } })}
        />
        <main className="flex-1 px-6 py-8 lg:px-10">
          <div className="mx-auto w-full max-w-7xl space-y-6">
            <Button
              variant="outline"
              onClick={() => navigate("/admin", { state: { section: "programmes" } })}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to programmes page
            </Button>
            {programme && (
              <>
                <Button
                  variant="outline"
                  onClick={() => exportAdminProgrammeDetailPdf(programme)}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Export PDF
                </Button>
              </>
            )}

            {loading ? (
              <Card>
                <CardContent className="py-10 text-sm text-muted-foreground">
                  Loading programme details...
                </CardContent>
              </Card>
            ) : !programme ? (
              <Card>
                <CardContent className="py-10 text-sm text-muted-foreground">
                  Programme details could not be loaded.
                </CardContent>
              </Card>
            ) : (
              <>
                <Card className="overflow-hidden border-border">
                  <div className="h-2 bg-gradient-to-r from-[#11173f] via-[#6b4d00] to-[#f5aa00]" />
                  <CardContent className="space-y-6 p-6">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center gap-3">
                          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
                            {programme.title}
                          </h1>
                          <Badge variant={programme.resultsPublishedAt ? "default" : "outline"}>
                            {programme.resultsPublishedAt ? "Completed" : "Active"}
                          </Badge>
                        </div>
                        <p className="max-w-3xl text-base leading-7 text-muted-foreground">
                          {programme.description || "No programme description added yet."}
                        </p>
                        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                          <span>Handled by: {programme.programmeManager?.name || "Not assigned"}</span>
                          <span>Enrolled {formatDate(programme.createdAt)}</span>
                          <span>{programme.assignments.filter((item) => item.pendingCount > 0).length} pending</span>
                          <span>
                            {programme.assignments.length > 0
                              ? `${programme.assignments.filter((item) => item.dueDate && new Date(item.dueDate) > new Date()).length} upcoming assignments`
                              : "No upcoming assignment"}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-3">
                        <Button variant="outline" onClick={() => setIsSettingsDialogOpen(true)}>
                          <Settings2 className="mr-2 h-4 w-4" />
                          Enrollment settings
                        </Button>
                        <Button variant="outline" onClick={() => setIsRequestsDialogOpen(true)}>
                          <Users className="mr-2 h-4 w-4" />
                          Enrollment requests
                        </Button>
                        <Button variant="outline" onClick={() => setIsAddScholarsDialogOpen(true)}>
                          <Plus className="mr-2 h-4 w-4" />
                          Add scholars
                        </Button>
                        <Button variant="outline" onClick={() => void handleProcessRequests()} disabled={processingRequests}>
                          {processingRequests ? "Processing requests..." : "Process enrollment requests"}
                        </Button>
                        <Button variant="outline" asChild>
                          <Link to="/admin">View list</Link>
                        </Button>
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-4">
                      <div className="rounded-2xl border border-border p-4">
                        <div className="flex items-center gap-3">
                          <Users className="h-5 w-5 text-vahani-blue" />
                          <div>
                            <p className="text-xs text-muted-foreground">Enrolled scholars</p>
                            <p className="text-2xl font-semibold">{programme.enrolledScholars.length}</p>
                          </div>
                        </div>
                      </div>
                      <div className="rounded-2xl border border-border p-4">
                        <div className="flex items-center gap-3">
                          <BookOpen className="h-5 w-5 text-vahani-blue" />
                          <div>
                            <p className="text-xs text-muted-foreground">Assignments</p>
                            <p className="text-2xl font-semibold">{programme.assignments.length}</p>
                          </div>
                        </div>
                      </div>
                      <div className="rounded-2xl border border-border p-4">
                        <div className="flex items-center gap-3">
                          <GraduationCap className="h-5 w-5 text-vahani-blue" />
                          <div>
                            <p className="text-xs text-muted-foreground">Interactive sessions</p>
                            <p className="text-2xl font-semibold">{programme.interactiveSessions.length}</p>
                          </div>
                        </div>
                      </div>
                      <div className="rounded-2xl border border-border p-4">
                        <div className="flex items-center gap-3">
                          <GraduationCap className="h-5 w-5 text-vahani-blue" />
                          <div>
                            <p className="text-xs text-muted-foreground">Certificates issued</p>
                            <p className="text-2xl font-semibold">
                              {programme.enrolledScholars.filter((scholar) => scholar.certificate).length}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Enrolled scholars and results</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="rounded-xl border border-border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Scholar</TableHead>
                            <TableHead>Batch</TableHead>
                            <TableHead>Gender</TableHead>
                            <TableHead className="text-right">Assignment score</TableHead>
                            <TableHead className="text-right">Session score</TableHead>
                            <TableHead className="text-right">Overall</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Certificate</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {programme.enrolledScholars.map((scholar) => (
                            <TableRow key={scholar.id}>
                              <TableCell>
                                <div>
                                  <p className="font-medium text-foreground">{scholar.user.name}</p>
                                  <p className="text-xs text-muted-foreground">{scholar.user.email}</p>
                                </div>
                              </TableCell>
                              <TableCell>{scholar.user.batch || "--"}</TableCell>
                              <TableCell>{scholar.user.gender || "--"}</TableCell>
                              <TableCell className="text-right">{scholar.assignmentScore}</TableCell>
                              <TableCell className="text-right">{scholar.sessionScore}</TableCell>
                              <TableCell className="text-right">
                                {scholar.totalScore}
                                {scholar.totalPossibleScore > 0
                                  ? ` / ${scholar.totalPossibleScore} (${scholar.overallPercent ?? "--"}%)`
                                  : ""}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline">{scholar.status}</Badge>
                              </TableCell>
                              <TableCell>
                                {scholar.certificate ? scholar.certificate.credentialId : "--"}
                              </TableCell>
                              <TableCell className="text-right">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => void handleRemoveScholar(scholar.user.id)}
                                >
                                  Remove
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>

                <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
                  <Card>
                    <CardHeader>
                      <CardTitle>Assignments and sessions</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {programme.assignments.map((assignment) => (
                        <div key={assignment.id} className="rounded-2xl border border-border p-4">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <p className="font-semibold text-foreground">{assignment.title}</p>
                              <p className="mt-1 text-sm text-muted-foreground">
                                Due {formatDate(assignment.dueDate)} • {assignment.submissionCount}/{assignment.totalScholars} submitted
                              </p>
                            </div>
                            <Badge variant="secondary">{assignment.assignmentType}</Badge>
                          </div>
                        </div>
                      ))}

                      {programme.interactiveSessions.map((session) => (
                        <div key={session.id} className="rounded-2xl border border-border p-4">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <p className="font-semibold text-foreground">{session.title}</p>
                              <p className="mt-1 text-sm text-muted-foreground">
                                {formatDate(session.scheduledAt)} • {session.attendanceCount} marked • {session.absentCount} absent
                              </p>
                            </div>
                            <Badge variant="outline">Interactive session</Badge>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </div>
              </>
            )}
          </div>
        </main>
      </div>

      <Dialog open={isSettingsDialogOpen} onOpenChange={setIsSettingsDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Self-enrollment settings</DialogTitle>
            <DialogDescription>
              Configure FCFS requests, seat limits, windows, and eligibility rules for this programme.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-xl border border-border p-4">
              <div>
                <p className="font-medium text-foreground">Enable scholar requests</p>
                <p className="text-sm text-muted-foreground">
                  Eligible scholars can submit FCFS enrollment requests.
                </p>
              </div>
              <Switch
                checked={selfEnrollmentForm.enabled}
                onCheckedChange={(checked) =>
                  setSelfEnrollmentForm((current) => ({
                    ...current,
                    enabled: checked,
                  }))
                }
              />
            </div>

            {selfEnrollmentForm.enabled ? (
              <>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Seat limit</Label>
                    <Input
                      type="number"
                      min="1"
                      value={selfEnrollmentForm.seatLimit}
                      onChange={(event) =>
                        setSelfEnrollmentForm((current) => ({
                          ...current,
                          seatLimit: event.target.value,
                        }))
                      }
                      placeholder="Leave blank for no limit"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Enrollment opens at</Label>
                    <Input
                      type="datetime-local"
                      value={selfEnrollmentForm.opensAt}
                      onChange={(event) =>
                        setSelfEnrollmentForm((current) => ({
                          ...current,
                          opensAt: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Enrollment closes at</Label>
                    <Input
                      type="datetime-local"
                      value={selfEnrollmentForm.closesAt}
                      onChange={(event) =>
                        setSelfEnrollmentForm((current) => ({
                          ...current,
                          closesAt: event.target.value,
                        }))
                      }
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Eligible batches</Label>
                  <div className="rounded-xl border border-border p-4">
                    <div className="mb-3 flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setSelfEnrollmentForm((current) => ({
                            ...current,
                            allowedBatches: [],
                          }))
                        }
                      >
                        All batches
                      </Button>
                    </div>
                    <div className="grid gap-2 md:grid-cols-2">
                      {batchOptions.map((batch) => (
                        <label key={batch} className="flex items-center gap-3 rounded-lg border border-border p-3">
                          <Checkbox
                            checked={selfEnrollmentForm.allowedBatches.includes(batch)}
                            onCheckedChange={() =>
                              setSelfEnrollmentForm((current) => ({
                                ...current,
                                allowedBatches: current.allowedBatches.includes(batch)
                                  ? current.allowedBatches.filter((entry) => entry !== batch)
                                  : [...current.allowedBatches, batch],
                              }))
                            }
                          />
                          <span className="text-sm text-foreground">{batch}</span>
                        </label>
                      ))}
                    </div>
                    {batchOptions.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No scholar batches are available yet.</p>
                    ) : null}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Eligible genders</Label>
                  <div className="rounded-xl border border-border p-4">
                    <div className="mb-3 flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setSelfEnrollmentForm((current) => ({
                            ...current,
                            allowedGenders: [],
                          }))
                        }
                      >
                        All genders
                      </Button>
                    </div>
                    <div className="grid gap-2 md:grid-cols-2">
                      {genderOptions.map((gender) => (
                        <label key={gender} className="flex items-center gap-3 rounded-lg border border-border p-3">
                          <Checkbox
                            checked={selfEnrollmentForm.allowedGenders.includes(gender)}
                            onCheckedChange={() =>
                              setSelfEnrollmentForm((current) => ({
                                ...current,
                                allowedGenders: current.allowedGenders.includes(gender)
                                  ? current.allowedGenders.filter((entry) => entry !== gender)
                                  : [...current.allowedGenders, gender],
                              }))
                            }
                          />
                          <span className="text-sm text-foreground">{gender}</span>
                        </label>
                      ))}
                    </div>
                    {genderOptions.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No scholar genders are available yet.</p>
                    ) : null}
                  </div>
                </div>
              </>
            ) : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSettingsDialogOpen(false)}>
              Close
            </Button>
            <Button
              onClick={() => void handleSaveRules().then(() => setIsSettingsDialogOpen(false))}
              disabled={savingRules}
            >
              {savingRules ? "Saving..." : "Save settings"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isRequestsDialogOpen} onOpenChange={setIsRequestsDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Enrollment requests</DialogTitle>
            <DialogDescription>
              Review request queue and process FCFS allocations for this programme.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={() => void handleProcessRequests()} disabled={processingRequests}>
                {processingRequests ? "Processing..." : "Process requests now"}
              </Button>
            </div>
            <div className="max-h-[60vh] space-y-3 overflow-y-auto pr-1">
              {programme?.selfEnrollmentRequests.length ? (
                programme.selfEnrollmentRequests.map((request) => (
                  <div key={request.id} className="rounded-2xl border border-border p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold text-foreground">{request.user.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {request.user.email}
                          {request.user.batch ? ` • ${request.user.batch}` : ""}
                          {request.user.gender ? ` • ${request.user.gender}` : ""}
                        </p>
                      </div>
                      <Badge variant={request.status === "accepted" ? "default" : request.status === "pending" ? "outline" : "secondary"}>
                        {request.status}
                      </Badge>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Requested {formatDate(request.requestedAt)}
                      {request.decidedAt ? ` • Decided ${formatDate(request.decidedAt)}` : ""}
                    </p>
                    {request.decisionReason ? (
                      <p className="mt-2 text-sm text-muted-foreground">{request.decisionReason}</p>
                    ) : null}
                  </div>
                ))
              ) : (
                <div className="rounded-xl border border-dashed border-border px-4 py-6 text-sm text-muted-foreground">
                  No enrollment requests yet.
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isAddScholarsDialogOpen} onOpenChange={setIsAddScholarsDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Add scholars</DialogTitle>
            <DialogDescription>
              Select scholars to enroll directly into this programme. Only scholars matching
              the current self-enrollment rules are suggested here.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Select value={batchFilter} onValueChange={setBatchFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All batches" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All batches</SelectItem>
                  {batchOptions.map((batch) => (
                    <SelectItem key={batch} value={batch}>
                      {batch}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="outline"
                onClick={() => setSelectedScholarIds(availableScholars.map((scholar) => scholar.id))}
                disabled={availableScholars.length === 0}
              >
                Select matched
              </Button>
            </div>

            <div className="rounded-xl bg-muted/40 p-3 text-xs text-muted-foreground">
              Suggested scholars: {availableScholars.length}
              {selfEnrollmentForm.enabled
                ? " eligible by the current rules."
                : " available for direct enrollment."}
            </div>

            <div className="max-h-[60vh] space-y-2 overflow-y-auto pr-1">
              {availableScholars.map((scholar) => (
                <label key={scholar.id} className="flex items-center gap-3 rounded-xl border border-border p-3">
                  <Checkbox
                    checked={selectedScholarIds.includes(scholar.id)}
                    onCheckedChange={() =>
                      setSelectedScholarIds((current) =>
                        current.includes(scholar.id)
                          ? current.filter((id) => id !== scholar.id)
                          : [...current, scholar.id],
                      )
                    }
                  />
                  <div className="min-w-0">
                    <p className="font-medium text-foreground">{scholar.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {scholar.email}
                      {scholar.batch ? ` • ${scholar.batch}` : ""}
                      {scholar.gender ? ` • ${scholar.gender}` : ""}
                    </p>
                  </div>
                </label>
              ))}
              {availableScholars.length === 0 && (
                <div className="rounded-xl border border-dashed border-border px-4 py-6 text-sm text-muted-foreground">
                  No available scholars match this batch filter.
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddScholarsDialogOpen(false)}>
              Close
            </Button>
            <Button
              onClick={() =>
                void handleAddScholars().then(() => {
                  setIsAddScholarsDialogOpen(false);
                })
              }
              disabled={selectedScholarIds.length === 0}
            >
              Add selected scholars
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
