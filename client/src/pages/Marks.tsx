import { useEffect, useMemo, useState } from "react";
import { AppSidebar } from "../components/dashboard/AppSidebar";
import { TopNavbar } from "../components/dashboard/TopNavbar";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Badge } from "../components/ui/badge";
import { useToast } from "../hooks/use-toast";
import { getMyProgrammes, type Programme } from "../api/programmes";

type MarkRow = {
  id: string;
  itemType: "Assignment" | "Interactive Session";
  name: string;
  marks: string;
  status: string;
};

const formatMarks = (score?: number | null, maxScore?: number | null) => {
  if (score === null || score === undefined) {
    return "-";
  }

  if (maxScore === null || maxScore === undefined) {
    return String(score);
  }

  return `${score}/${maxScore}`;
};

export default function Marks() {
  const { toast } = useToast();
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProgrammeId, setSelectedProgrammeId] = useState("");

  useEffect(() => {
    const loadProgrammes = async () => {
      try {
        setLoading(true);
        const response = await getMyProgrammes();
        const nextProgrammes = Array.isArray(response?.data?.programmes)
          ? (response.data.programmes as Programme[])
          : [];
        setProgrammes(nextProgrammes);
      } catch (error) {
        toast({
          title: "Unable to load marks",
          description: error instanceof Error ? error.message : "Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    void loadProgrammes();
  }, [toast]);

  const selectedProgramme = useMemo(
    () => programmes.find((programme) => programme.id === selectedProgrammeId) || null,
    [programmes, selectedProgrammeId],
  );

  const rows = useMemo<MarkRow[]>(() => {
    if (!selectedProgramme) {
      return [];
    }

    const assignmentRows = selectedProgramme.assignments.map((assignment) => {
      const submission = assignment.submissions[0];
      const status = !submission
        ? "Not submitted"
        : submission.score === null || submission.score === undefined
          ? "Under evaluation"
          : "Evaluated";

      return {
        id: assignment.id,
        itemType: "Assignment" as const,
        name: assignment.title,
        marks:
          submission && submission.score !== null && submission.score !== undefined
            ? formatMarks(submission.score, assignment.maxScore)
            : "-",
        status,
      };
    });

    const sessionRows = (selectedProgramme.interactiveSessions || []).map((session) => {
      const attendance = session.attendances?.[0];
      const status = !attendance
        ? "Not marked"
        : attendance.status === "absent"
          ? "Absent"
          : "Present";

      return {
        id: session.id,
        itemType: "Interactive Session" as const,
        name: session.title,
        marks: formatMarks(attendance?.score, session.maxScore),
        status,
      };
    });

    return [...assignmentRows, ...sessionRows];
  }, [selectedProgramme]);

  const programmeTotals = useMemo(() => {
    if (!selectedProgramme) {
      return null;
    }

    const assignmentPossible = selectedProgramme.assignments.reduce(
      (sum, assignment) => sum + (assignment.maxScore || 0),
      0,
    );
    const assignmentScored = selectedProgramme.assignments.reduce((sum, assignment) => {
      const submission = assignment.submissions[0];
      return sum + (submission?.score || 0);
    }, 0);

    const sessionPossible = (selectedProgramme.interactiveSessions || []).reduce(
      (sum, session) => sum + (session.maxScore || 0),
      0,
    );
    const sessionScored = (selectedProgramme.interactiveSessions || []).reduce(
      (sum, session) => sum + (session.attendances?.[0]?.score || 0),
      0,
    );

    const totalPossible = assignmentPossible + sessionPossible;
    const totalScored = assignmentScored + sessionScored;

    return {
      totalScored,
      totalPossible,
      percentage:
        totalPossible > 0
          ? Number(((totalScored / totalPossible) * 100).toFixed(2))
          : 0,
    };
  }, [selectedProgramme]);

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar activePage="Marks" />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopNavbar />
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6 lg:p-8">
            <section className="space-y-2">
              <h1 className="text-2xl font-bold tracking-tight">Marks</h1>
              <p className="text-sm text-muted-foreground">
                Select one enrolled programme to view assignment scores, interactive session marks, attendance, and submission status.
              </p>
            </section>

            <Card>
              <CardHeader>
                <CardTitle>Select programme</CardTitle>
              </CardHeader>
              <CardContent>
                <Select value={selectedProgrammeId} onValueChange={setSelectedProgrammeId}>
                  <SelectTrigger className="max-w-xl">
                    <SelectValue placeholder={loading ? "Loading programmes..." : "Choose one enrolled programme"} />
                  </SelectTrigger>
                  <SelectContent>
                    {programmes.map((programme) => (
                      <SelectItem key={programme.id} value={programme.id}>
                        {programme.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {!loading && programmes.length === 0 && (
                  <p className="mt-3 text-sm text-muted-foreground">
                    You are not enrolled in any programmes yet.
                  </p>
                )}
              </CardContent>
            </Card>

            {selectedProgramme && (
              <Card>
                <CardHeader>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <CardTitle>{selectedProgramme.title}</CardTitle>
                      <Badge variant="outline" className="capitalize">
                        {selectedProgramme.status}
                      </Badge>
                    </div>
                    {programmeTotals && (
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="secondary">
                          Total marks {programmeTotals.totalScored}/{programmeTotals.totalPossible}
                        </Badge>
                        <Badge className="bg-vahani-blue/10 text-vahani-blue">
                          {programmeTotals.percentage}%
                        </Badge>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {rows.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No assignments or interactive sessions found for this programme yet.
                    </p>
                  ) : (
                    <div className="overflow-x-auto rounded-xl border border-border">
                      <table className="min-w-full divide-y divide-border text-sm">
                        <thead className="bg-muted/40">
                          <tr>
                            <th className="px-4 py-3 text-left font-medium text-foreground">Type</th>
                            <th className="px-4 py-3 text-left font-medium text-foreground">Name</th>
                            <th className="px-4 py-3 text-left font-medium text-foreground">Marks Scored</th>
                            <th className="px-4 py-3 text-left font-medium text-foreground">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {rows.map((row) => (
                            <tr key={`${row.itemType}-${row.id}`}>
                              <td className="px-4 py-3 text-muted-foreground">{row.itemType}</td>
                              <td className="px-4 py-3 text-foreground">{row.name}</td>
                              <td className="px-4 py-3 text-muted-foreground">{row.marks}</td>
                              <td className="px-4 py-3 text-muted-foreground">{row.status}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
