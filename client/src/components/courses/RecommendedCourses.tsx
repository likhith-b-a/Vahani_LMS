import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import type { Course } from "@/data/courses";

interface Props {
  courses: Course[];
  enrolledIds: string[];
  onEnroll: (id: string) => void;
  onViewDetails: (c: Course) => void;
}

export function RecommendedCourses({ courses, enrolledIds, onEnroll, onViewDetails }: Props) {
  const recommended = courses.filter((c) => c.recommended);
  if (recommended.length === 0) return null;

  return (
    <section>
      <div className="flex items-center gap-2 mb-4">
        <Sparkles size={18} className="text-accent" />
        <h2 className="text-lg font-semibold">Recommended for You</h2>
      </div>
      <div className="flex gap-4 overflow-x-auto pb-2">
        {recommended.map((course) => {
          const enrolled = enrolledIds.includes(course.id);
          return (
            <Card key={course.id} className="min-w-[280px] max-w-[300px] shrink-0 border-accent/30 bg-accent/5">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <h4 className="font-semibold text-sm">{course.title}</h4>
                  <Badge className="bg-accent text-accent-foreground text-[10px] shrink-0">Recommended</Badge>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">{course.description}</p>
                <p className="text-[11px] text-muted-foreground italic">
                  Since you're building skills, this course is a great next step.
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={() => onViewDetails(course)}>
                    Details
                  </Button>
                  <Button
                    size="sm"
                    className={`flex-1 text-xs ${enrolled ? "bg-muted text-muted-foreground" : "bg-accent text-accent-foreground hover:bg-accent/90"}`}
                    disabled={enrolled}
                    onClick={() => onEnroll(course.id)}
                  >
                    {enrolled ? "Enrolled ✓" : "Enroll"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
