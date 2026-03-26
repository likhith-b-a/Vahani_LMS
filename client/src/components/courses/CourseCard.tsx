import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CalendarDays, Clock, Monitor, MapPin, User, Users } from "lucide-react";
import { motion } from "framer-motion";
import type { Course } from "@/data/courses";

interface Props {
  course: Course;
  enrolled: boolean;
  onEnroll: (id: string) => void;
  onViewDetails: (c: Course) => void;
}

export function CourseCard({ course, enrolled, onEnroll, onViewDetails }: Props) {
  const seatPercent = ((course.totalSeats - course.seatsLeft) / course.totalSeats) * 100;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="group hover:shadow-lg transition-shadow duration-300 overflow-hidden">
        {/* Top accent bar */}
        <div className="h-1.5 bg-gradient-to-r from-primary to-accent" />
        <CardContent className="p-5 space-y-4">
          {/* Title + badges */}
          <div>
            <div className="flex items-start justify-between gap-2 mb-2">
              <h3 className="font-bold text-foreground leading-tight">{course.title}</h3>
              <div className="flex gap-1 shrink-0">
                {course.popular && (
                  <Badge className="bg-accent text-accent-foreground text-[10px] px-1.5">🔥 Popular</Badge>
                )}
                {enrolled && (
                  <Badge variant="secondary" className="text-[10px] px-1.5">✓ Enrolled</Badge>
                )}
              </div>
            </div>
            <p className="text-sm text-muted-foreground line-clamp-2">{course.description}</p>
          </div>

          {/* Meta */}
          <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5"><User size={13} />{course.trainer}</span>
            <span className="flex items-center gap-1.5"><Clock size={13} />{course.duration}</span>
            <span className="flex items-center gap-1.5"><CalendarDays size={13} />{course.startDate}</span>
            <span className="flex items-center gap-1.5">
              {course.mode === "Online" ? <Monitor size={13} /> : <MapPin size={13} />}
              {course.mode}
            </span>
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-1.5">
            {course.tags.map((tag) => (
              <Badge key={tag} variant="outline" className="text-[10px] font-normal">{tag}</Badge>
            ))}
          </div>

          {/* Seats */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><Users size={12} />{course.seatsLeft} seats left</span>
              <span>{Math.round(seatPercent)}% filled</span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${course.seatsLeft <= 5 ? "bg-destructive" : "bg-accent"}`}
                style={{ width: `${seatPercent}%` }}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 text-xs"
              onClick={() => onViewDetails(course)}
            >
              View Details
            </Button>
            <Button
              size="sm"
              className={`flex-1 text-xs font-semibold ${enrolled ? "bg-muted text-muted-foreground cursor-not-allowed" : "bg-accent text-accent-foreground hover:bg-accent/90"}`}
              disabled={enrolled}
              onClick={() => onEnroll(course.id)}
            >
              {enrolled ? "Enrolled ✓" : "Enroll Now"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
