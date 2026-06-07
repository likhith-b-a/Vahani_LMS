import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { ArrowLeft, Download, RefreshCw, Users } from "lucide-react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  bulkAssignManagedProgrammeTutors,
  downloadManagedProgrammeTutorTemplate,
  getManagedProgrammeDetail,
  type ManagedProgramme,
  updateManagedProgrammeScholarTutor,
} from "../api/programmeManager";
import { getManagerSectionRoute, ManagerSidebar } from "../components/dashboard/ManagerSidebar";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../hooks/use-toast";

const formatDate = (value?: string | null) =>
  value
    ? new Date(value).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "No date";

export default function ManagerProgrammeTutors() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();

  const dashboardBasePath = location.pathname.startsWith("/tutor")
    ? "/tutor"
    : "/programme-manager";

  const [programme, setProgramme] = useState<ManagedProgramme | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingEnrollmentId, setUpdatingEnrollmentId] = useState<string | null>(null);
  const [uploadingSheet, setUploadingSheet] = useState(false);
  const [search, setSearch] = useState("");
  const [batchFilter, setBatchFilter] = useState("all");

  const tutorUploadInputRef = useRef<HTMLInputElement | null>(null);

  const loadProgramme = useCallback(async () => {
    if (!id) {
      setProgramme(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await getManagedProgrammeDetail(id);
      setProgramme((response?.data?.programme as ManagedProgramme) || null);
    } catch (error) {
      toast({
        title: "Unable to load tutor assignment workspace",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [id, toast]);

  useEffect(() => {
    void loadProgramme();
  }, [loadProgramme]);

  const batchOptions = useMemo(
    () =>
      Array.from(
        new Set(
          (programme?.enrollments || [])
            .map((enrollment) => enrollment.user.batch?.trim())
            .filter((batch): batch is string => Boolean(batch)),
        ),
      ).sort((left, right) => left.localeCompare(right)),
    [programme?.enrollments],
  );

  const filteredEnrollments = useMemo(() => {
    if (!programme) {
      return [];
    }

    return programme.enrollments.filter((enrollment) => {
      const matchesSearch =
        !search.trim() ||
        `${enrollment.user.name} ${enrollment.user.email} ${enrollment.user.batch || ""} ${enrollment.assignedTutor?.name || ""} ${enrollment.assignedTutor?.email || ""}`
          .toLowerCase()
          .includes(search.toLowerCase());
      const matchesBatch =
        batchFilter === "all" ||
        (enrollment.user.batch || "").toLowerCase() === batchFilter.toLowerCase();

      return matchesSearch && matchesBatch;
    });
  }, [batchFilter, programme, search]);

  const handleAssignTutor = async (enrollmentId: string, assignedTutorId: string) => {
    if (!programme) return;

    try {
      setUpdatingEnrollmentId(enrollmentId);
      await updateManagedProgrammeScholarTutor(programme.id, enrollmentId, {
        assignedTutorId: assignedTutorId || null,
      });
      await loadProgramme();
      toast({
        title: "Tutor assignment updated",
        description: assignedTutorId
          ? "The tutor was assigned to the selected scholar."
          : "Tutor assignment removed for the selected scholar.",
      });
    } catch (error) {
      toast({
        title: "Unable to update tutor assignment",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setUpdatingEnrollmentId(null);
    }
  };

  const handleDownloadTutorTemplate = async () => {
    if (!programme) return;

    try {
      const blob = await downloadManagedProgrammeTutorTemplate(programme.id);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${programme.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-tutor-assignment.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      toast({
        title: "Unable to download tutor assignment sheet",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleTutorUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    if (!programme) return;

    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setUploadingSheet(true);
      await bulkAssignManagedProgrammeTutors(programme.id, file);
      await loadProgramme();
      toast({
        title: "Tutor assignment sheet applied",
        description: "Scholar tutor assignments were updated from the uploaded file.",
      });
    } catch (error) {
      toast({
        title: "Unable to upload tutor assignment sheet",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploadingSheet(false);
      if (tutorUploadInputRef.current) {
        tutorUploadInputRef.current.value = "";
      }
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      <ManagerSidebar
        activeSection="programmes"
        onSelectSection={(section) => navigate(getManagerSectionRoute(dashboardBasePath, section))}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-border bg-card/80 px-4 pl-14 backdrop-blur-md lg:px-8 lg:pl-8">
          <div>
            <h1 className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
              Programme Manager
            </h1>
            <p className="text-xs text-muted-foreground">Welcome, {user?.name}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => void loadProgramme()}>
              <RefreshCw size={16} className="mr-2" />
              Refresh
            </Button>
            <Button variant="outline" onClick={() => navigate(`${dashboardBasePath}/programmes/${id}`)}>
              <ArrowLeft size={16} className="mr-2" />
              Back to programme
            </Button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto flex max-w-6xl flex-col gap-6 p-4 sm:p-6 lg:p-8">
            {loading ? (
              <Card>
                <CardContent className="py-12 text-sm text-muted-foreground">
                  Loading tutor assignment workspace...
                </CardContent>
              </Card>
            ) : !programme ? (
              <Card>
                <CardContent className="py-12 text-sm text-muted-foreground">
                  This programme could not be loaded.
                </CardContent>
              </Card>
            ) : (
              <>
                <section className="overflow-hidden rounded-[2rem] border border-border bg-[linear-gradient(135deg,rgba(12,106,204,0.10),rgba(255,255,255,0.98),rgba(255,199,88,0.08))] p-6 shadow-sm sm:p-8">
                  <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-vahani-blue">
                        Tutor Assignment
                      </p>
                      <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                        {programme.title}
                      </h2>
                      <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
                        Assign tutors to enrolled scholars from one table view, or use the Excel sheet for faster bulk updates.
                      </p>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 lg:w-[420px]">
                      <div className="rounded-2xl border border-border bg-card/80 p-4">
                        <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
                          Scholars
                        </p>
                        <p className="mt-2 text-lg font-semibold text-foreground">
                          {programme.enrollments.length}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-border bg-card/80 p-4">
                        <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
                          Available tutors
                        </p>
                        <p className="mt-2 text-lg font-semibold text-foreground">
                          {programme.assignableTutors?.length || 0}
                        </p>
                      </div>
                    </div>
                  </div>
                </section>

                <Card>
                  <CardHeader>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-base font-semibold text-foreground">Assignment actions</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Download the current roster with tutor emails, edit it, and upload it back when needed.
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button type="button" variant="outline" onClick={() => void handleDownloadTutorTemplate()}>
                          <Download className="mr-2 h-4 w-4" />
                          Download tutor sheet
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => tutorUploadInputRef.current?.click()}
                          disabled={uploadingSheet}
                        >
                          {uploadingSheet ? "Uploading..." : "Upload filled sheet"}
                        </Button>
                        <input
                          ref={tutorUploadInputRef}
                          type="file"
                          accept=".xlsx,.xls"
                          className="hidden"
                          onChange={handleTutorUpload}
                        />
                      </div>
                    </div>
                  </CardHeader>
                </Card>

                <Card>
                  <CardHeader>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-base font-semibold text-foreground">Scholar tutor assignment</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Assign or change a tutor for each enrolled scholar.
                        </p>
                      </div>
                      <Badge variant="outline">{filteredEnrollments.length} visible</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-3 sm:grid-cols-[1fr_220px]">
                      <Input
                        placeholder="Filter scholars by name, email, batch, or assigned tutor"
                        value={search}
                        onChange={(event: ChangeEvent<HTMLInputElement>) => setSearch(event.target.value)}
                      />
                      <select
                        className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                        value={batchFilter}
                        onChange={(event: ChangeEvent<HTMLSelectElement>) => setBatchFilter(event.target.value)}
                      >
                        <option value="all">All batches</option>
                        {batchOptions.map((batch) => (
                          <option key={batch} value={batch}>
                            {batch}
                          </option>
                        ))}
                      </select>
                    </div>

                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Scholar</TableHead>
                          <TableHead>Batch</TableHead>
                          <TableHead>Enrolled</TableHead>
                          <TableHead>Assigned tutor</TableHead>
                          <TableHead className="w-[280px]">Update</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredEnrollments.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-sm text-muted-foreground">
                              No scholars match the current filter.
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredEnrollments.map((enrollment) => (
                            <TableRow key={enrollment.id}>
                              <TableCell>
                                <div>
                                  <p className="font-medium text-foreground">{enrollment.user.name}</p>
                                  <p className="text-xs text-muted-foreground">{enrollment.user.email}</p>
                                </div>
                              </TableCell>
                              <TableCell>{enrollment.user.batch || "No batch"}</TableCell>
                              <TableCell>{formatDate(enrollment.enrolledAt)}</TableCell>
                              <TableCell>
                                <div>
                                  <p className="font-medium text-foreground">
                                    {enrollment.assignedTutor?.name || "Not assigned"}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {enrollment.assignedTutor?.email || "No tutor selected"}
                                  </p>
                                </div>
                              </TableCell>
                              <TableCell>
                                <select
                                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                                  value={enrollment.assignedTutorId || ""}
                                  disabled={updatingEnrollmentId === enrollment.id}
                                  onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                                    void handleAssignTutor(enrollment.id, event.target.value)
                                  }
                                >
                                  <option value="">No tutor assigned</option>
                                  {(programme.assignableTutors || []).map((tutor) => (
                                    <option key={tutor.id} value={tutor.id}>
                                      {tutor.name} ({tutor.email})
                                    </option>
                                  ))}
                                </select>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
