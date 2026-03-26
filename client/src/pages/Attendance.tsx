import { AppSidebar } from "@/components/dashboard/AppSidebar";
import { TopNavbar } from "@/components/dashboard/TopNavbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { CalendarCheck, AlertTriangle, CheckCircle2, TrendingUp } from "lucide-react";

const ongoingCourses = [
  { name: "Advanced Excel", attended: 18, total: 22, percentage: 82 },
  { name: "English Communication", attended: 14, total: 20, percentage: 70 },
  { name: "Power BI Fundamentals", attended: 8, total: 15, percentage: 53 },
  { name: "CV Building Workshop", attended: 10, total: 10, percentage: 100 },
  { name: "Voluntary Activities", attended: 6, total: 8, percentage: 75 },
];

const completedCourses = [
  { name: "Excel Basics", attended: 20, total: 20, percentage: 100 },
  { name: "Spoken English", attended: 17, total: 20, percentage: 85 },
  { name: "Digital Literacy", attended: 14, total: 18, percentage: 78 },
];

function getStatusBadge(percentage: number) {
  if (percentage >= 75) return <Badge className="bg-green-500/15 text-green-600 border-green-500/30">Good</Badge>;
  if (percentage >= 50) return <Badge className="bg-yellow-500/15 text-yellow-600 border-yellow-500/30">Average</Badge>;
  return <Badge className="bg-red-500/15 text-red-600 border-red-500/30">Low</Badge>;
}

function getProgressColor(percentage: number) {
  if (percentage >= 75) return "bg-green-500";
  if (percentage >= 50) return "bg-yellow-500";
  return "bg-red-500";
}

const overallAttended = [...ongoingCourses, ...completedCourses].reduce((s, c) => s + c.attended, 0);
const overallTotal = [...ongoingCourses, ...completedCourses].reduce((s, c) => s + c.total, 0);
const overallPercentage = Math.round((overallAttended / overallTotal) * 100);
const lowCourses = ongoingCourses.filter(c => c.percentage < 75);

function CourseRow({ course }: { course: typeof ongoingCourses[0] }) {
  return (
    <Card className="border border-border">
      <CardContent className="p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-sm text-foreground truncate">{course.name}</h3>
              {getStatusBadge(course.percentage)}
            </div>
            <p className="text-xs text-muted-foreground">
              {course.attended} / {course.total} classes attended
            </p>
          </div>
          <div className="flex items-center gap-3 sm:w-48">
            <div className="flex-1">
              <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
                <div className={`h-full rounded-full transition-all ${getProgressColor(course.percentage)}`} style={{ width: `${course.percentage}%` }} />
              </div>
            </div>
            <span className="text-sm font-bold text-foreground w-12 text-right">{course.percentage}%</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Attendance() {
  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar activePage="Attendance" />
      <div className="flex-1 flex flex-col min-w-0">
        <TopNavbar />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Attendance</h1>
            <p className="text-muted-foreground text-sm mt-1">Track your attendance across all courses</p>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10"><CalendarCheck className="h-5 w-5 text-primary" /></div>
                <div>
                  <p className="text-xs text-muted-foreground">Overall</p>
                  <p className="text-xl font-bold text-foreground">{overallPercentage}%</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/10"><CheckCircle2 className="h-5 w-5 text-green-500" /></div>
                <div>
                  <p className="text-xs text-muted-foreground">Classes Attended</p>
                  <p className="text-xl font-bold text-foreground">{overallAttended}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-accent"><TrendingUp className="h-5 w-5 text-accent-foreground" /></div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Classes</p>
                  <p className="text-xl font-bold text-foreground">{overallTotal}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-red-500/10"><AlertTriangle className="h-5 w-5 text-red-500" /></div>
                <div>
                  <p className="text-xs text-muted-foreground">Low Attendance</p>
                  <p className="text-xl font-bold text-foreground">{lowCourses.length} courses</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Alerts */}
          {lowCourses.length > 0 && (
            <div className="space-y-2">
              {lowCourses.map(c => (
                <div key={c.name} className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm">
                  <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
                  <span className="text-foreground">⚠️ Your attendance in <strong>{c.name}</strong> is {c.percentage}% — below the required 75%</span>
                </div>
              ))}
            </div>
          )}

          {/* Tabs */}
          <Tabs defaultValue="ongoing">
            <TabsList>
              <TabsTrigger value="ongoing">Ongoing Courses</TabsTrigger>
              <TabsTrigger value="completed">Completed Courses</TabsTrigger>
            </TabsList>
            <TabsContent value="ongoing" className="space-y-3 mt-4">
              {ongoingCourses.map(c => <CourseRow key={c.name} course={c} />)}
            </TabsContent>
            <TabsContent value="completed" className="space-y-3 mt-4">
              {completedCourses.map(c => <CourseRow key={c.name} course={c} />)}
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  );
}
