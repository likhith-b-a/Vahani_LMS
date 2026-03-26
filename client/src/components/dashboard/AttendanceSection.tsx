import { CalendarCheck, AlertTriangle, CheckCircle, TrendingUp, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

// NOTE: This is demo/mock data. Real attendance will be implemented later.
const overallAttendance = 82;

const courseAttendance = [
  { name: "Advanced Excel Mastery", attended: 8, total: 10, percentage: 80 },
  { name: "Business English Communication", attended: 7, total: 10, percentage: 70 },
  { name: "Python for Beginners", attended: 5, total: 8, percentage: 63 },
  { name: "Power BI Fundamentals", attended: 9, total: 10, percentage: 90 },
];

const recentActivity = [
  { date: "Mar 19, 2026", course: "Advanced Excel Mastery", status: "present" as const },
  { date: "Mar 18, 2026", course: "Business English Communication", status: "present" as const },
  { date: "Mar 17, 2026", course: "Python for Beginners", status: "absent" as const },
  { date: "Mar 16, 2026", course: "Power BI Fundamentals", status: "present" as const },
  { date: "Mar 15, 2026", course: "Advanced Excel Mastery", status: "present" as const },
];

const weeklyTrend = [
  { week: "W1", value: 75 },
  { week: "W2", value: 80 },
  { week: "W3", value: 70 },
  { week: "W4", value: 85 },
  { week: "W5", value: 82 },
];

function getStatusColor(pct: number) {
  if (pct >= 75) return "text-success";
  if (pct >= 50) return "text-accent";
  return "text-destructive";
}

function getStatusBadge(pct: number) {
  if (pct >= 75) return { label: "Good", className: "bg-success/15 text-success border-success/30" };
  if (pct >= 50) return { label: "Average", className: "bg-accent/15 text-accent border-accent/30" };
  return { label: "Low", className: "bg-destructive/15 text-destructive border-destructive/30" };
}

function getOverallColor(pct: number) {
  if (pct >= 75) return "stroke-success";
  if (pct >= 50) return "stroke-accent";
  return "stroke-destructive";
}

function CircularProgress({ value, size = 80 }: { value: number; size?: number }) {
  const strokeWidth = 7;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth={strokeWidth} className="stroke-secondary" />
        <motion.circle
          cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth={strokeWidth}
          strokeLinecap="round"
          className={getOverallColor(value)}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: "easeOut" }}
          style={{ strokeDasharray: circumference }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-lg sm:text-xl font-bold tabular-nums">{value}%</span>
      </div>
    </div>
  );
}

export function AttendanceSection() {
  const lowCourses = courseAttendance.filter(c => c.percentage < 75);
  const maxTrend = Math.max(...weeklyTrend.map(w => w.value));

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-lg">Attendance</h3>
        <Button variant="ghost" size="sm" className="text-xs sm:text-sm font-semibold text-primary gap-1">
          View Details <ChevronRight size={14} />
        </Button>
      </div>

      {/* Overview + Trend */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <CalendarCheck size={16} /> Attendance Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="flex items-center gap-4 sm:gap-6">
              <CircularProgress value={overallAttendance} />
              <div className="space-y-1 min-w-0">
                <p className="text-sm font-semibold">Overall Attendance</p>
                <p className="text-xs text-muted-foreground">Across all active courses</p>
                {overallAttendance >= 75 ? (
                  <div className="flex items-center gap-1 text-xs text-success font-medium mt-1">
                    <CheckCircle size={12} /> Great consistency!
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-xs text-destructive font-medium mt-1">
                    <AlertTriangle size={12} /> Needs improvement
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.05 }}>
          <Card className="h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <TrendingUp size={16} /> Weekly Trend
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-2 h-16">
                {weeklyTrend.map((w, i) => (
                  <div key={w.week} className="flex-1 flex flex-col items-center gap-1">
                    <motion.div
                      className="w-full bg-primary/80 rounded-t"
                      initial={{ height: 0 }}
                      animate={{ height: `${(w.value / maxTrend) * 56}px` }}
                      transition={{ duration: 0.5, delay: i * 0.08 }}
                    />
                    <span className="text-[10px] text-muted-foreground">{w.week}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Alerts */}
      {lowCourses.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="space-y-2">
          {lowCourses.map(c => (
            <div key={c.name} className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/5 px-3 sm:px-4 py-2.5 text-xs sm:text-sm">
              <AlertTriangle size={14} className="text-destructive shrink-0" />
              <span>Attendance in <span className="font-semibold">{c.name}</span> is low ({c.percentage}%)</span>
            </div>
          ))}
        </motion.div>
      )}

      {/* Course-wise breakdown */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Course-wise Attendance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {courseAttendance.map((course, i) => {
            const badge = getStatusBadge(course.percentage);
            return (
              <motion.div
                key={course.name}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 + i * 0.05 }}
                className="flex items-center justify-between py-2 border-b border-border last:border-0 hover:bg-muted/30 -mx-2 px-2 rounded transition-colors gap-2"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm truncate">{course.name}</p>
                  <p className="text-xs text-muted-foreground">{course.attended} / {course.total} classes</p>
                </div>
                <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                  <span className={`text-sm font-bold tabular-nums ${getStatusColor(course.percentage)}`}>
                    {course.percentage}%
                  </span>
                  <Badge variant="outline" className={badge.className}>{badge.label}</Badge>
                </div>
              </motion.div>
            );
          })}
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Recent Attendance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {recentActivity.map((item, i) => (
            <motion.div
              key={`${item.date}-${item.course}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.15 + i * 0.04 }}
              className="flex items-center justify-between text-sm py-1.5 gap-2"
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <div className={`w-2 h-2 rounded-full shrink-0 ${item.status === "present" ? "bg-success" : "bg-destructive"}`} />
                <span className="truncate text-muted-foreground text-xs sm:text-sm">{item.course}</span>
              </div>
              <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                <span className="text-[10px] sm:text-xs text-muted-foreground">{item.date}</span>
                <span className={`text-[10px] sm:text-xs font-medium capitalize ${item.status === "present" ? "text-success" : "text-destructive"}`}>
                  {item.status}
                </span>
              </div>
            </motion.div>
          ))}
        </CardContent>
      </Card>
    </section>
  );
}
