import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { ArrowLeft, Download, RefreshCw, Users } from "lucide-react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  bulkAssignManagedProgrammeGrouping,
  downloadManagedProgrammeGroupingTemplate,
  getManagedProgrammeDetail,
  type ManagedProgramme,
  updateManagedProgrammeGrouping,
  updateManagedProgrammeScholarGrouping,
} from "../api/programmeManager";
import { ManagerSidebar } from "../components/dashboard/ManagerSidebar";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Switch } from "../components/ui/switch";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../hooks/use-toast";

const parseCommaSeparatedValues = (value: string) =>
  value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);

const formatDate = (value?: string | null) =>
  value
    ? new Date(value).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "No date";

export default function ManagerProgrammeGrouping() {
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
  const [groupingSaving, setGroupingSaving] = useState(false);
  const [groupingUploading, setGroupingUploading] = useState(false);
  const [updatingEnrollmentId, setUpdatingEnrollmentId] = useState<string | null>(null);
  const [groupingSearch, setGroupingSearch] = useState("");
  const [groupingBatchFilter, setGroupingBatchFilter] = useState("all");
  const [groupingForm, setGroupingForm] = useState({
    enabled: false,
    trackGroupsText: "",
  });

  const groupingUploadInputRef = useRef<HTMLInputElement | null>(null);

  const loadProgramme = useCallback(async () => {
    if (!id) {
      setProgramme(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await getManagedProgrammeDetail(id);
      const nextProgramme = (response?.data?.programme as ManagedProgramme) || null;
      setProgramme(nextProgramme);
      setGroupingForm({
        enabled: !!nextProgramme?.groupedDeliveryEnabled,
        trackGroupsText: (nextProgramme?.groupTrackGroups || []).join(", "),
      });
    } catch (error) {
      toast({
        title: "Unable to load grouped delivery",
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

  const groupingBatchOptions = useMemo(
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

  const filteredGroupingEnrollments = useMemo(() => {
    if (!programme) {
      return [];
    }

    return programme.enrollments.filter((enrollment) => {
      const matchesSearch =
        !groupingSearch.trim() ||
        `${enrollment.user.name} ${enrollment.user.email} ${enrollment.user.batch || ""} ${enrollment.trackGroup || ""}`
          .toLowerCase()
          .includes(groupingSearch.toLowerCase());
      const matchesBatch =
        groupingBatchFilter === "all" ||
        (enrollment.user.batch || "").toLowerCase() === groupingBatchFilter.toLowerCase();

      return matchesSearch && matchesBatch;
    });
  }, [groupingBatchFilter, groupingSearch, programme]);

  const handleSaveGroupingSettings = async () => {
    if (!programme) return;

    try {
      setGroupingSaving(true);
      await updateManagedProgrammeGrouping(programme.id, {
        groupedDeliveryEnabled: groupingForm.enabled,
        groupTrackGroups: parseCommaSeparatedValues(groupingForm.trackGroupsText),
      });
      await loadProgramme();
      toast({
        title: "Grouped delivery updated",
        description: groupingForm.enabled
          ? "Track groups are ready for scholar assignment."
          : "Grouped delivery has been disabled for this programme.",
      });
    } catch (error) {
      toast({
        title: "Unable to update grouped delivery",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setGroupingSaving(false);
    }
  };

  const handleUpdateScholarGrouping = async (
    enrollmentId: string,
    trackGroup: string | null,
  ) => {
    if (!programme) return;

    try {
      setUpdatingEnrollmentId(enrollmentId);
      await updateManagedProgrammeScholarGrouping(programme.id, enrollmentId, { trackGroup });
      await loadProgramme();
    } catch (error) {
      toast({
        title: "Unable to update scholar grouping",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setUpdatingEnrollmentId(null);
    }
  };

  const handleDownloadGroupingTemplate = async () => {
    if (!programme) return;

    try {
      const blob = await downloadManagedProgrammeGroupingTemplate(programme.id);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${programme.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-scholar-grouping.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      toast({
        title: "Unable to download grouping sheet",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleGroupingUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    if (!programme) return;

    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setGroupingUploading(true);
      await bulkAssignManagedProgrammeGrouping(programme.id, file);
      await loadProgramme();
      toast({
        title: "Grouping sheet applied",
        description: "Scholar track groups were updated from the uploaded file.",
      });
    } catch (error) {
      toast({
        title: "Unable to upload grouping sheet",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setGroupingUploading(false);
      if (groupingUploadInputRef.current) {
        groupingUploadInputRef.current.value = "";
      }
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      <ManagerSidebar
        activeSection="programmes"
        onSelectSection={(section) => navigate(`${dashboardBasePath}?section=${section}`)}
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
                  Loading grouped delivery...
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
                <section className="overflow-hidden rounded-[2rem] border border-border bg-[linear-gradient(135deg,rgba(12,106,204,0.10),rgba(255,255,255,0.98),rgba(32,201,151,0.06))] p-6 shadow-sm sm:p-8">
                  <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-vahani-blue">
                        Grouped Delivery
                      </p>
                      <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                        {programme.title}
                      </h2>
                      <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
                        Assign scholars to English track groups from one dedicated page, with filters and Excel support.
                      </p>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 lg:w-[360px]">
                      <div className="rounded-2xl border border-border bg-card/80 p-4">
                        <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
                          Status
                        </p>
                        <p className="mt-2 text-lg font-semibold text-foreground">
                          {groupingForm.enabled ? "Enabled" : "Disabled"}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-border bg-card/80 p-4">
                        <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
                          Scholars
                        </p>
                        <p className="mt-2 text-lg font-semibold text-foreground">
                          {programme.enrollments.length}
                        </p>
                      </div>
                    </div>
                  </div>
                </section>

                <Card>
                  <CardHeader>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-base font-semibold text-foreground">Programme setup</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Turn grouped delivery on when this programme needs track-group assignment.
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-muted-foreground">
                          {groupingForm.enabled ? "Enabled" : "Disabled"}
                        </span>
                        <Switch
                          checked={groupingForm.enabled}
                          onCheckedChange={(value) =>
                            setGroupingForm((current) => ({ ...current, enabled: value }))
                          }
                        />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Track groups</Label>
                      <Input
                        placeholder="A, B, C"
                        value={groupingForm.trackGroupsText}
                        onChange={(event: ChangeEvent<HTMLInputElement>) =>
                          setGroupingForm((current) => ({
                            ...current,
                            trackGroupsText: event.target.value,
                          }))
                        }
                      />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button onClick={() => void handleSaveGroupingSettings()} disabled={groupingSaving}>
                        {groupingSaving ? "Saving..." : "Save grouped delivery settings"}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => void handleDownloadGroupingTemplate()}
                        disabled={!groupingForm.enabled}
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Download grouping sheet
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => groupingUploadInputRef.current?.click()}
                        disabled={!groupingForm.enabled || groupingUploading}
                      >
                        {groupingUploading ? "Uploading..." : "Upload filled sheet"}
                      </Button>
                      <input
                        ref={groupingUploadInputRef}
                        type="file"
                        accept=".xlsx,.xls"
                        className="hidden"
                        onChange={handleGroupingUpload}
                      />
                    </div>
                  </CardContent>
                </Card>

                {groupingForm.enabled ? (
                  <Card>
                    <CardHeader>
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-base font-semibold text-foreground">Scholar assignment</p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            Filter scholars and assign the right track group before the programme starts.
                          </p>
                        </div>
                        <Badge variant="outline">{filteredGroupingEnrollments.length} visible</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid gap-3 sm:grid-cols-[1fr_220px]">
                        <Input
                          placeholder="Filter scholars by name, email, batch, or current group"
                          value={groupingSearch}
                          onChange={(event: ChangeEvent<HTMLInputElement>) =>
                            setGroupingSearch(event.target.value)
                          }
                        />
                        <select
                          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                          value={groupingBatchFilter}
                          onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                            setGroupingBatchFilter(event.target.value)
                          }
                        >
                          <option value="all">All batches</option>
                          {groupingBatchOptions.map((batch) => (
                            <option key={batch} value={batch}>
                              {batch}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-3">
                        {filteredGroupingEnrollments.length === 0 ? (
                          <p className="text-sm text-muted-foreground">
                            No scholars match the current filter.
                          </p>
                        ) : (
                          filteredGroupingEnrollments.map((enrollment) => (
                            <div
                              key={enrollment.id}
                              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/70 p-3"
                            >
                              <div>
                                <p className="font-medium text-foreground">{enrollment.user.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {enrollment.user.email}
                                  {enrollment.user.batch ? ` • ${enrollment.user.batch}` : ""}
                                  {enrollment.user.gender ? ` • ${enrollment.user.gender}` : ""}
                                  {` • Enrolled ${formatDate(enrollment.enrolledAt)}`}
                                </p>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="text-xs text-muted-foreground">
                                  Current: {enrollment.trackGroup || "Unassigned"}
                                </span>
                                <select
                                  className="h-10 min-w-[160px] rounded-md border border-input bg-background px-3 text-sm"
                                  value={enrollment.trackGroup || ""}
                                  disabled={updatingEnrollmentId === enrollment.id}
                                  onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                                    void handleUpdateScholarGrouping(
                                      enrollment.id,
                                      event.target.value || null,
                                    )
                                  }
                                >
                                  <option value="">Unassigned</option>
                                  {parseCommaSeparatedValues(groupingForm.trackGroupsText).map((group) => (
                                    <option key={group} value={group}>
                                      {group}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ) : null}
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
