import { useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  CalendarCheck,
  CheckCircle2,
  Mail,
  Save,
  Trophy,
  User,
  Users,
} from "lucide-react";
import { AppSidebar } from "../components/dashboard/AppSidebar";
import { TopNavbar } from "../components/dashboard/TopNavbar";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Progress } from "../components/ui/progress";
import { useAssignments } from "../contexts/AssignmentsContext";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../hooks/use-toast";
import { getMyProfile, updateMyProfile, type MyProfileResponse } from "../api/profile";
import { getMyProgrammes, type Programme } from "../api/programmes";

const formatDate = (value?: string | null) =>
  value
    ? new Date(value).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "No date";

export default function Profile() {
  const { user, setAuthData } = useAuth();
  const { toast } = useToast();
  const { assignments, loading: assignmentsLoading } = useAssignments();

  const [profile, setProfile] = useState<MyProfileResponse | null>(null);
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [name, setName] = useState("");
  const [batch, setBatch] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProfile = async () => {
      setLoading(true);
      try {
        const [profileResponse, programmesResponse] = await Promise.all([
          getMyProfile(),
          getMyProgrammes(),
        ]);

        const profileData = profileResponse.data as MyProfileResponse;
        setProfile(profileData);
        setName(profileData.name);
        setBatch(profileData.batch || "");
        setPhoneNumber(profileData.phoneNumber || "");
        setProgrammes(
          Array.isArray(programmesResponse?.data?.programmes)
            ? (programmesResponse.data.programmes as Programme[])
            : [],
        );
      } catch (error) {
        toast({
          title: "Failed to load profile",
          description:
            error instanceof Error ? error.message : "Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    void loadProfile();
  }, [toast]);

  const assignmentStats = useMemo(() => {
    const pending = assignments.filter((assignment) => assignment.status === "PENDING").length;
    const submitted = assignments.filter((assignment) => assignment.status === "SUBMITTED").length;
    const graded = assignments.filter((assignment) => assignment.status === "GRADED").length;

    return {
      total: assignments.length,
      pending,
      submitted,
      graded,
    };
  }, [assignments]);

  const programmeStats = useMemo(() => {
    const active = profile?.enrollments.filter((programme) => programme.status === "active").length || 0;
    const completed =
      profile?.enrollments.filter((programme) => programme.status === "completed").length || 0;
    const uncompleted =
      profile?.enrollments.filter((programme) => programme.status === "uncompleted").length || 0;

    return {
      active,
      completed,
      uncompleted,
    };
  }, [profile?.enrollments]);

  const attendanceStats = useMemo(() => {
    const sessions = programmes.flatMap((programme) => programme.interactiveSessions || []);
    const pastSessions = sessions.filter(
      (session) => new Date(session.scheduledAt).getTime() <= Date.now(),
    );
    const marked = pastSessions.filter((session) => session.attendances?.[0]);
    const present = marked.filter(
      (session) => session.attendances?.[0]?.status === "present",
    );
    const certificateReady = programmes.filter((programme) => programme.certificateAvailable).length;

    return {
      totalSessions: sessions.length,
      attendanceRate:
        marked.length > 0 ? Math.round((present.length / marked.length) * 100) : 0,
      certificateReady,
    };
  }, [programmes]);

  const completionPercent = useMemo(() => {
    const fields = [
      profile?.name,
      profile?.email,
      profile?.phoneNumber,
      profile?.batch,
      profile?.enrollments.length ? "programmes" : "",
      assignmentStats.total > 0 ? "assignments" : "",
    ];

    return Math.round((fields.filter(Boolean).length / fields.length) * 100);
  }, [assignmentStats.total, profile]);

  const initials =
    profile?.name
      ?.split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "U";

  const handleSave = async () => {
    if (!name.trim()) {
      toast({
        title: "Name required",
        description: "Please enter your name before saving.",
        variant: "destructive",
      });
      return;
    }

    try {
      setSaving(true);
      const response = await updateMyProfile({
        name: name.trim(),
        batch: batch.trim(),
        phoneNumber: phoneNumber.trim(),
      });
      const updatedProfile = response.data as MyProfileResponse;
      setProfile(updatedProfile);
      setName(updatedProfile.name);
      setBatch(updatedProfile.batch || "");
      setPhoneNumber(updatedProfile.phoneNumber || "");

      if (user) {
        setAuthData({
          ...user,
          name: updatedProfile.name,
          batch: updatedProfile.batch || null,
          phoneNumber: updatedProfile.phoneNumber || null,
          creditsEarned: updatedProfile.creditsEarned || 0,
          enrollments: user.enrollments,
        });
      }

      toast({
        title: "Profile updated",
        description: "Your scholar profile has been saved successfully.",
      });
    } catch (error) {
      toast({
        title: "Unable to save profile",
        description:
          error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar activePage="Overview" />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopNavbar />
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6 lg:p-8">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">My Profile</h1>
              <p className="text-sm text-muted-foreground">
                Review your scholar identity, learning progress, credits, and programme journey.
              </p>
            </div>

            <Card>
              <CardContent className="pt-5">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-medium">Profile Completion</span>
                  <span className="text-sm font-bold text-accent-foreground">
                    {completionPercent}%
                  </span>
                </div>
                <Progress value={completionPercent} className="h-2" />
              </CardContent>
            </Card>

            <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
              <Card>
                <CardHeader>
                  <CardTitle>Scholar Identity</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex flex-col items-center gap-5 sm:flex-row">
                    <div className="flex h-24 w-24 items-center justify-center rounded-full bg-vahani-blue text-2xl font-bold text-primary-foreground">
                      {initials}
                    </div>
                    <div className="text-center sm:text-left">
                      <h2 className="text-xl font-bold">
                        {loading ? "Loading..." : profile?.name || "Scholar"}
                      </h2>
                      <p className="text-sm text-muted-foreground">
                        {profile?.email || user?.email}
                      </p>
                      <Badge className="mt-2 capitalize" variant="secondary">
                        {profile?.role || user?.role || "scholar"}
                      </Badge>
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="profile-name">Full Name</Label>
                      <Input
                        id="profile-name"
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                        disabled={loading}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="profile-email">Email</Label>
                      <Input
                        id="profile-email"
                        value={profile?.email || user?.email || ""}
                        disabled
                        className="bg-muted/50"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="profile-batch">Batch</Label>
                      <Input
                        id="profile-batch"
                        value={batch}
                        onChange={(event) => setBatch(event.target.value)}
                        placeholder="2026-A"
                        disabled={loading}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="profile-phone">Phone Number</Label>
                      <Input
                        id="profile-phone"
                        value={phoneNumber}
                        onChange={(event) => setPhoneNumber(event.target.value)}
                        placeholder="+91 90000 00000"
                        disabled={loading}
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="rounded-xl border border-border p-4">
                      <p className="text-xs text-muted-foreground">Credits Earned</p>
                      <p className="mt-2 text-2xl font-bold">
                        {profile?.creditsEarned ?? 0}
                      </p>
                    </div>
                    <div className="rounded-xl border border-border p-4">
                      <p className="text-xs text-muted-foreground">Batch</p>
                      <p className="mt-2 text-base font-semibold">
                        {profile?.batch || "Not added"}
                      </p>
                    </div>
                    <div className="rounded-xl border border-border p-4">
                      <p className="text-xs text-muted-foreground">Phone</p>
                      <p className="mt-2 text-base font-semibold">
                        {profile?.phoneNumber || "Not added"}
                      </p>
                    </div>
                  </div>

                  <div className="flex justify-end border-t border-border pt-4">
                    <Button
                      onClick={() => void handleSave()}
                      disabled={saving || loading}
                      className="gap-2 bg-vahani-blue hover:bg-vahani-blue/90"
                    >
                      <Save size={16} />
                      {saving ? "Saving..." : "Save Changes"}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Learning Snapshot</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-xl border border-border p-4">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Active Programmes</span>
                      <BookOpen size={16} className="text-vahani-blue" />
                    </div>
                    <p className="text-2xl font-bold">{programmeStats.active}</p>
                  </div>
                  <div className="rounded-xl border border-border p-4">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Completed</span>
                      <CheckCircle2 size={16} className="text-success" />
                    </div>
                    <p className="text-2xl font-bold">{programmeStats.completed}</p>
                  </div>
                  <div className="rounded-xl border border-border p-4">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Attendance Rate</span>
                      <CalendarCheck size={16} className="text-vahani-gold" />
                    </div>
                    <p className="text-2xl font-bold">
                      {attendanceStats.totalSessions ? `${attendanceStats.attendanceRate}%` : "--"}
                    </p>
                  </div>
                  <div className="rounded-xl border border-border p-4">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Certificates Ready</span>
                      <Trophy size={16} className="text-accent" />
                    </div>
                    <p className="text-2xl font-bold">{attendanceStats.certificateReady}</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-6 lg:grid-cols-4">
              <Card>
                <CardContent className="pt-5">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Pending Tasks</span>
                    <User size={16} className="text-accent" />
                  </div>
                  <p className="text-2xl font-bold">
                    {assignmentsLoading ? "..." : assignmentStats.pending}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-5">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Submitted</span>
                    <Mail size={16} className="text-vahani-blue" />
                  </div>
                  <p className="text-2xl font-bold">
                    {assignmentsLoading ? "..." : assignmentStats.submitted}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-5">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Graded</span>
                    <CheckCircle2 size={16} className="text-success" />
                  </div>
                  <p className="text-2xl font-bold">
                    {assignmentsLoading ? "..." : assignmentStats.graded}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-5">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Uncompleted</span>
                    <Users size={16} className="text-muted-foreground" />
                  </div>
                  <p className="text-2xl font-bold">{programmeStats.uncompleted}</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
              <Card>
                <CardHeader>
                  <CardTitle>Programme Journey</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {loading ? (
                    <p className="text-sm text-muted-foreground">Loading programmes...</p>
                  ) : profile?.enrollments.length ? (
                    profile.enrollments.map((programme) => {
                      const detailedProgramme = programmes.find((entry) => entry.id === programme.id);
                      const programmeSessions = detailedProgramme?.interactiveSessions || [];
                      const presentCount = programmeSessions.filter(
                        (session) => session.attendances?.[0]?.status === "present",
                      ).length;
                      const attendanceRate =
                        programmeSessions.length > 0
                          ? Math.round((presentCount / programmeSessions.length) * 100)
                          : null;

                      return (
                        <div
                          key={programme.id}
                          className="rounded-xl border border-border p-4"
                        >
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                              <p className="font-semibold text-foreground">{programme.title}</p>
                              <p className="mt-1 text-sm text-muted-foreground">
                                {programme.description || "No description available."}
                              </p>
                            </div>
                            <Badge variant="outline" className="capitalize">
                              {programme.status}
                            </Badge>
                          </div>
                          <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
                            <span>Joined {formatDate(programme.enrolledAt)}</span>
                            <span>Manager: {programme.programmeManager?.name || "Unassigned"}</span>
                            {attendanceRate !== null ? (
                              <span>Attendance {attendanceRate}%</span>
                            ) : (
                              <span>No sessions marked yet</span>
                            )}
                            {detailedProgramme?.certificateAvailable ? (
                              <span>Certificate available</span>
                            ) : null}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      You are not enrolled in any programmes yet.
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Support Contacts</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {profile?.enrollments.length ? (
                    profile.enrollments.map((programme) => (
                      <div
                        key={`${programme.id}-manager`}
                        className="rounded-xl border border-border p-4"
                      >
                        <div className="mb-2 flex items-center gap-2">
                          <Users size={16} className="text-muted-foreground" />
                          <p className="font-medium text-foreground">{programme.title}</p>
                        </div>
                        <p className="text-sm">
                          {programme.programmeManager?.name || "No manager assigned"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {programme.programmeManager?.email || "No contact email"}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Your assigned programme managers will appear here.
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
