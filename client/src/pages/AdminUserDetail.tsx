import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Award, BookOpen, CalendarDays, GraduationCap, Mail, Phone, Users } from "lucide-react";
import { getAdminUserDetail, type AdminUserDetail } from "@/api/admin";
import { AdminSidebar } from "@/components/dashboard/AdminSidebar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { downloadCsvReport, exportReportAsPdf } from "@/lib/reportExport";

const roleLabel = (role: AdminUserDetail["role"]) =>
  role === "programme_manager"
    ? "Programme manager"
    : role === "admin"
      ? "Admin"
      : "Scholar";

const formatDate = (value?: string | null) =>
  value
    ? new Date(value).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "--";

export default function AdminUserDetailPage() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [userDetail, setUserDetail] = useState<AdminUserDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!userId) {
        navigate("/admin");
        return;
      }

      setLoading(true);
      try {
        const response = await getAdminUserDetail(userId);
        setUserDetail((response.data as AdminUserDetail) || null);
      } catch (error) {
        toast({
          title: "Unable to load user details",
          description: error instanceof Error ? error.message : "Please try again shortly.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [navigate, toast, userId]);

  const topStats =
    userDetail?.role === "scholar"
      ? [
          {
            label: "Programme history",
            value: userDetail.programmeHistory.length,
            icon: BookOpen,
          },
          {
            label: "Certificates",
            value: userDetail.certificates.length,
            icon: Award,
          },
          {
            label: "Credits earned",
            value: userDetail.creditsEarned,
            icon: GraduationCap,
          },
        ]
      : userDetail?.role === "programme_manager"
        ? [
            {
              label: "Managed programmes",
              value: userDetail.managedProgrammes.length,
              icon: BookOpen,
            },
            {
              label: "Certificates issued",
              value: userDetail.certificates.length,
              icon: Award,
            },
            {
              label: "Completed scholars",
              value: userDetail.managedProgrammes.reduce(
                (sum, programme) => sum + programme.completedScholarCount,
                0,
              ),
              icon: Users,
            },
          ]
        : [
            {
              label: "Created on",
              value: formatDate(userDetail?.createdAt),
              icon: CalendarDays,
            },
          ];

  return (
    <div className="min-h-screen bg-background">
      <div className="flex">
        <AdminSidebar
          activeSection="users"
          onSelectSection={(section) => navigate("/admin", { state: { section } })}
        />
        <main className="flex-1 px-6 py-8 lg:px-10">
          <div className="mx-auto w-full max-w-7xl space-y-6">
            <div className="flex flex-wrap items-center gap-3">
              <Button
                variant="outline"
                onClick={() => navigate("/admin", { state: { section: "users" } })}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to users page
              </Button>
              {userDetail && (
                <>
                  <Button
                    variant="outline"
                    onClick={() => {
                      const rows =
                        userDetail.role === "scholar"
                          ? userDetail.programmeHistory.map((entry) => ({
                              scholarId: userDetail.id,
                              name: userDetail.name,
                              email: userDetail.email,
                              batch: userDetail.batch || "",
                              programme: entry.programme.title,
                              status: entry.status,
                              overallPercent: entry.overallPercent ?? "",
                              creditsAwarded: entry.creditsAwarded,
                              attendancePercent: entry.attendanceSummary.attendancePercent ?? "",
                              certificateId: entry.certificate?.credentialId || "",
                            }))
                          : userDetail.managedProgrammes.map((programme) => ({
                              managerId: userDetail.id,
                              name: userDetail.name,
                              email: userDetail.email,
                              programme: programme.title,
                              scholars: programme.scholarCount,
                              completed: programme.completedScholarCount,
                              assignments: programme.assignmentCount,
                              sessions: programme.interactiveSessionCount,
                              certificates: programme.certificatesIssuedCount,
                            }));

                      downloadCsvReport(
                        {
                          type: "admin-user-detail",
                          generatedAt: new Date().toISOString(),
                          rows,
                        },
                        `${userDetail.name.replace(/\s+/g, "-").toLowerCase()}-detail`,
                      );
                    }}
                  >
                    Export CSV
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      const rows =
                        userDetail.role === "scholar"
                          ? userDetail.programmeHistory.map((entry) => ({
                              scholarId: userDetail.id,
                              name: userDetail.name,
                              email: userDetail.email,
                              batch: userDetail.batch || "",
                              programme: entry.programme.title,
                              status: entry.status,
                              overallPercent: entry.overallPercent ?? "",
                              creditsAwarded: entry.creditsAwarded,
                              attendancePercent: entry.attendanceSummary.attendancePercent ?? "",
                              certificateId: entry.certificate?.credentialId || "",
                            }))
                          : userDetail.managedProgrammes.map((programme) => ({
                              managerId: userDetail.id,
                              name: userDetail.name,
                              email: userDetail.email,
                              programme: programme.title,
                              scholars: programme.scholarCount,
                              completed: programme.completedScholarCount,
                              assignments: programme.assignmentCount,
                              sessions: programme.interactiveSessionCount,
                              certificates: programme.certificatesIssuedCount,
                            }));

                      exportReportAsPdf(
                        {
                          type: "admin-user-detail",
                          generatedAt: new Date().toISOString(),
                          rows,
                        },
                        `${userDetail.name} details`,
                        `${userDetail.name.replace(/\s+/g, "-").toLowerCase()}-detail`,
                      );
                    }}
                  >
                    Export PDF
                  </Button>
                </>
              )}
            </div>

            {loading ? (
              <Card>
                <CardContent className="py-10 text-sm text-muted-foreground">
                  Loading user details...
                </CardContent>
              </Card>
            ) : !userDetail ? (
              <Card>
                <CardContent className="py-10 text-sm text-muted-foreground">
                  User details could not be loaded.
                </CardContent>
              </Card>
            ) : (
              <>
                <Card>
                  <CardHeader className="gap-4">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-3">
                          <CardTitle className="text-3xl">{userDetail.name}</CardTitle>
                          <Badge variant="secondary">{roleLabel(userDetail.role)}</Badge>
                        </div>
                        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                          <span className="inline-flex items-center gap-2">
                            <Mail className="h-4 w-4" />
                            {userDetail.email}
                          </span>
                          <span className="inline-flex items-center gap-2">
                            <Phone className="h-4 w-4" />
                            {userDetail.phoneNumber || "No phone"}
                          </span>
                          {userDetail.batch && <span>Batch: {userDetail.batch}</span>}
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Joined on {formatDate(userDetail.createdAt)}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 md:grid-cols-3">
                      {topStats.map((stat) => (
                        <div key={stat.label} className="rounded-2xl border border-border p-4">
                          <div className="flex items-center gap-3">
                            <stat.icon className="h-5 w-5 text-vahani-blue" />
                            <div>
                              <p className="text-xs text-muted-foreground">{stat.label}</p>
                              <p className="mt-1 text-2xl font-semibold text-foreground">{stat.value}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {userDetail.role === "scholar" && (
                  <>
                    <Card>
                      <CardHeader>
                        <CardTitle>Programme history</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        {userDetail.programmeHistory.map((entry) => (
                          <div key={entry.enrollmentId} className="rounded-2xl border border-border p-5">
                            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                              <div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <h3 className="text-lg font-semibold text-foreground">
                                    {entry.programme.title}
                                  </h3>
                                  <Badge variant="outline">{entry.status}</Badge>
                                  {entry.certificate && <Badge>Certified</Badge>}
                                </div>
                                <p className="mt-1 text-sm text-muted-foreground">
                                  Programme manager: {entry.programme.programmeManager?.name || "--"}
                                </p>
                                <div className="mt-2 flex flex-wrap gap-4 text-xs text-muted-foreground">
                                  <span>Enrolled: {formatDate(entry.enrolledAt)}</span>
                                  <span>Completed: {formatDate(entry.completedAt)}</span>
                                  <span>Credits awarded: {entry.creditsAwarded}</span>
                                  <span>Attendance: {entry.attendanceSummary.attendancePercent ?? "--"}%</span>
                                </div>
                              </div>
                              {entry.certificate && (
                                <Button variant="outline" asChild>
                                  <a href={entry.certificate.fileUrl} target="_blank" rel="noreferrer">
                                    View certificate
                                  </a>
                                </Button>
                              )}
                            </div>

                            <div className="mt-5 grid gap-4 xl:grid-cols-2">
                              <div className="rounded-xl border border-border">
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead>Assignment</TableHead>
                                      <TableHead>Status</TableHead>
                                      <TableHead className="text-right">Marks</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {entry.assignments.map((assignment) => (
                                      <TableRow key={assignment.id}>
                                        <TableCell>{assignment.title}</TableCell>
                                        <TableCell>{assignment.status.replaceAll("_", " ")}</TableCell>
                                        <TableCell className="text-right">
                                          {assignment.score ?? "--"}
                                          {assignment.maxScore ? ` / ${assignment.maxScore}` : ""}
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </div>

                              <div className="rounded-xl border border-border">
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead>Interactive session</TableHead>
                                      <TableHead>Attendance</TableHead>
                                      <TableHead className="text-right">Marks</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {entry.interactiveSessions.map((session) => (
                                      <TableRow key={session.id}>
                                        <TableCell>{session.title}</TableCell>
                                        <TableCell>{session.attendanceStatus}</TableCell>
                                        <TableCell className="text-right">
                                          {session.score ?? "--"}
                                          {session.maxScore ? ` / ${session.maxScore}` : ""}
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </div>
                            </div>
                          </div>
                        ))}
                      </CardContent>
                    </Card>

                    {userDetail.certificates.length > 0 && (
                      <Card>
                        <CardHeader>
                          <CardTitle>Certificates</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="rounded-xl border border-border">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Programme</TableHead>
                                  <TableHead>Credential ID</TableHead>
                                  <TableHead>Issued on</TableHead>
                                  <TableHead>Status</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {userDetail.certificates.map((certificate) => (
                                  <TableRow key={certificate.id}>
                                    <TableCell>{certificate.programmeTitle}</TableCell>
                                    <TableCell>{certificate.credentialId}</TableCell>
                                    <TableCell>{formatDate(certificate.issuedAt)}</TableCell>
                                    <TableCell>{certificate.status}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </>
                )}

                {userDetail.role === "programme_manager" && (
                  <>
                    <Card>
                      <CardHeader>
                        <CardTitle>Managed programmes</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="rounded-xl border border-border">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Programme</TableHead>
                                <TableHead>Created</TableHead>
                                <TableHead className="text-right">Scholars</TableHead>
                                <TableHead className="text-right">Completed</TableHead>
                                <TableHead className="text-right">Assignments</TableHead>
                                <TableHead className="text-right">Sessions</TableHead>
                                <TableHead className="text-right">Certificates</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {userDetail.managedProgrammes.map((programme) => (
                                <TableRow key={programme.id}>
                                  <TableCell>{programme.title}</TableCell>
                                  <TableCell>{formatDate(programme.createdAt)}</TableCell>
                                  <TableCell className="text-right">{programme.scholarCount}</TableCell>
                                  <TableCell className="text-right">{programme.completedScholarCount}</TableCell>
                                  <TableCell className="text-right">{programme.assignmentCount}</TableCell>
                                  <TableCell className="text-right">{programme.interactiveSessionCount}</TableCell>
                                  <TableCell className="text-right">{programme.certificatesIssuedCount}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </CardContent>
                    </Card>

                    {userDetail.certificates.length > 0 && (
                      <Card>
                        <CardHeader>
                          <CardTitle>Issued certificates</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="rounded-xl border border-border">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Scholar</TableHead>
                                  <TableHead>Programme</TableHead>
                                  <TableHead>Credential ID</TableHead>
                                  <TableHead>Issued on</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {userDetail.certificates.map((certificate) => (
                                  <TableRow key={certificate.id}>
                                    <TableCell>{certificate.scholarName || "--"}</TableCell>
                                    <TableCell>{certificate.programmeTitle}</TableCell>
                                    <TableCell>{certificate.credentialId}</TableCell>
                                    <TableCell>{formatDate(certificate.issuedAt)}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
